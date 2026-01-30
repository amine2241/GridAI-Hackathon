from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import uuid
import os
import tempfile
from loguru import logger
from docling.document_converter import DocumentConverter
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from ...core import auth
from ...core.database import User, Workflow, KnowledgeDocument, AgentConfig, SystemLog, get_db
from ...schemas.auth import UserUpdate
from ...schemas.admin import WorkflowCreate, UpdateAgentRequest
from ...schemas.document import DocumentCreate
from ...services.rag_service import get_rag_service
from ...services.analytics_service import generate_dashboard_insights

router = APIRouter()

_stats_cache = {
    "data": None,
    "timestamp": None
}
CACHE_TTL_MINUTES = 30

@router.get("/users")
async def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    auth.check_admin_role(current_user)
    users = db.query(User).all()
    return [{"id": u.id, "email": u.email, "role": u.role, "workflow_id": u.workflow_id} for u in users]

@router.patch("/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    auth.check_admin_role(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = update.dict(exclude_unset=True)
    if 'role' in update_data:
        user.role = update_data['role']
    if 'workflow_id' in update_data:
        user.workflow_id = update_data['workflow_id']
        
    db.commit()
    return {"status": "success"}

@router.get("/workflows")
async def get_workflows(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    auth.check_admin_role(current_user)
    return db.query(Workflow).all()

@router.post("/workflows")
async def create_workflow(wd: WorkflowCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    wf = Workflow(
        id=str(uuid.uuid4()),
        name=wd.name,
        description=wd.description,
        config=wd.config
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf

@router.patch("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, wd: WorkflowCreate, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf.name = wd.name
    wf.description = wd.description
    wf.config = wd.config
    
    db.commit()
    db.refresh(wf)
    return wf

@router.delete("/workflows/{wf_id}")
async def delete_workflow(wf_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    auth.check_admin_role(current_user)
    wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
    if wf:
        db.delete(wf)
        db.commit()
    return {"status": "success"}

@router.post("/documents/upload")
async def upload_document(
    title: str = Form(...),
    category: str = Form("General"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.check_admin_role)
):
    content = ""
    if file.content_type == "text/plain":
        content = (await file.read()).decode("utf-8")
    elif file.content_type in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
                                "application/vnd.openxmlformats-officedocument.presentationml.presentation"]:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name
            
            converter = DocumentConverter()
            result = converter.convert(tmp_path)
            content = result.document.export_to_markdown()
            os.unlink(tmp_path)
        except Exception as e:
            logger.error(f"Docling processing error: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to process document: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, PPTX, or TXT.")

    if not content.strip():
        raise HTTPException(status_code=400, detail="No text content could be extracted from the file.")

    doc_id = str(uuid.uuid4())
    new_doc = KnowledgeDocument(id=doc_id, title=title, content=content, category=category)
    db.add(new_doc)
    db.commit()
    
    try:
        rs = get_rag_service()
        if rs:
            rs.add_documents([content], [{"id": doc_id, "title": title, "category": category}])
    except Exception as e:
        logger.error(f"Failed to sync with RAG: {e}")
    
    return {"id": doc_id, "title": title, "category": category, "status": "indexed"}

@router.get("/documents")
async def get_documents(db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    return db.query(KnowledgeDocument).all()

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(doc)
    db.commit()
    
    try:
        rs = get_rag_service()
        if rs:
            rs.delete_document(doc_id)
    except Exception as e:
        logger.error(f"Failed to delete from RAG: {e}")
        
    return {"status": "success"}

@router.get("/agents")
async def get_agents(db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    try:
        configs = db.query(AgentConfig).all()
        return [
            {
                "id": c.id, "name": c.name, "type": c.role, "status": c.status,
                "priority": int(c.priority) if c.priority.isdigit() else 5,
                "description": c.role + " handler",
                "systemPrompt": c.system_prompt, "tools": c.tools or [],
                "executionMode": "Automatic", "createdAt": "2026-01-01T00:00:00Z"
            } for c in configs
        ]
    except Exception as e:
        logger.error(f"Agents Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch agents")

@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, request: UpdateAgentRequest, db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    update_data = request.dict(exclude_unset=True)
    if 'systemPrompt' in update_data: agent.system_prompt = update_data['systemPrompt']
    if 'name' in update_data: agent.name = update_data['name']
    if 'priority' in update_data: agent.priority = str(update_data['priority'])
    if 'type' in update_data: agent.role = update_data['type']
    if 'status' in update_data: agent.status = update_data['status']
    if 'tools' in update_data: agent.tools = update_data['tools']
        
    db.commit()
    return {"status": "success"}

@router.get("/logs")
async def get_logs(db: Session = Depends(get_db), current_user: User = Depends(auth.check_admin_role)):
    try:
        logs = db.query(SystemLog).order_by(SystemLog.timestamp.desc()).limit(50).all()
        return [
            {
                "id": l.id, "timestamp": l.timestamp.isoformat() + "Z",
                "agentName": l.agent_name, "incidentId": l.incident_id,
                "status": l.status, "input": l.input_payload,
                "output": l.output_payload, "error": l.error_message,
                "latency": f"{l.latency_ms}ms"
            } for l in logs
        ]
    except Exception as e:
        logger.error(f"Logs Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch logs")

@router.get("/stats/incidents")
async def get_incident_stats(
    days: int = 7,
    limit: int = 200,  # Fetch last 200 for analysis
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.check_admin_role)
):
    """
    Returns comprehensive analytics for the admin dashboard:
    - Counts & Distributions
    - Timeline (Trend)
    - Heatmap (Day/Hour)
    - Performance (AI vs Human)
    - AI Insights (Anomaly detection)
    """
    try:
        if not refresh and _stats_cache["data"] and _stats_cache["timestamp"]:
            age = datetime.utcnow() - _stats_cache["timestamp"]
            if age < timedelta(minutes=CACHE_TTL_MINUTES):
                logger.info("Returning cached dashboard stats")
                return _stats_cache["data"]

        from ...services.servicenow_service import servicenow_service
        
        incidents = await servicenow_service.get_incidents(limit=limit)
        
        now = datetime.utcnow()
        stats = {
            "total": len(incidents),
            "open": 0,
            "resolved": 0,
            "critical": 0,
            "avg_resolution_time_hours": 0.0,
            "efficiency": {
                "ai_resolution_rate": 0,
                "human_resolution_rate": 0,
                "ai_avg_time": "2m",  # Mock baseline
                "human_avg_time": "4h"
            },
            "distributions": {
                "priority": defaultdict(int),
                "status": defaultdict(int),
                "category": defaultdict(int)
            },
            "timeline": defaultdict(int),  # Date -> Count
            "heatmap": [],  # List of {day, hour, value}
            "insights": []
        }

        heatmap_grid = defaultdict(int)  # (day_index, hour) -> count
        
        resolution_times = []
        ai_resolved_count = 0
        human_resolved_count = 0
        
        for inc in incidents:
            state = inc.get('state', '1') 
            prio = inc.get('priority', '3')
            cat = inc.get('category', 'unknown')
            created_str = inc.get('sys_created_on')
            contact_type = inc.get('contact_type', 'phone')
            
            if state in ['1', '2', '3']: stats['open'] += 1
            if state in ['6', '7']: stats['resolved'] += 1
            if prio == '1': stats['critical'] += 1
            
            p_label = {"1": "Critical", "2": "High", "3": "Medium", "4": "Low", "5": "Planning"}.get(prio, "Unknown")
            stats['distributions']['priority'][p_label] += 1
            
            s_label = {"1": "New", "2": "In Progress", "3": "On Hold", "6": "Resolved", "7": "Closed", "8": "Canceled"}.get(state, "Other")
            stats['distributions']['status'][s_label] += 1
            
            stats['distributions']['category'][cat] += 1
            
            if created_str:
                try:
                    dt = datetime.strptime(created_str, "%Y-%m-%d %H:%M:%S")
                    
                    date_key = dt.strftime("%Y-%m-%d")
                    stats['timeline'][date_key] += 1
                    
                    heatmap_grid[(dt.weekday(), dt.hour)] += 1
                    
                    if state in ['6', '7'] and inc.get('closed_at'):
                          closed_at = datetime.strptime(inc.get('closed_at'), "%Y-%m-%d %H:%M:%S")
                          diff = (closed_at - dt).total_seconds() / 3600
                          resolution_times.append(diff)
                    
                    if contact_type == 'Virtual Agent' or 'AI' in (inc.get('short_description') or ""):
                        if state in ['6', '7']: ai_resolved_count += 1
                    else:
                        if state in ['6', '7']: human_resolved_count += 1
                        
                except Exception:
                    pass

       
        final_timeline = []
        for i in range(days):
            d = (now - timedelta(days=6-i)).strftime("%Y-%m-%d")
            final_timeline.append({"date": d, "count": stats['timeline'].get(d, 0)})
        stats['timeline'] = final_timeline

    
        days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for d_idx in range(7):
            for h in range(0, 24, 2):  
                val = heatmap_grid[(d_idx, h)] + heatmap_grid[(d_idx, h+1)]
                if val > 0:
                    stats['heatmap'].append({
                        "day": days_map[d_idx],
                        "hour": f"{h:02d}:00",
                        "value": val
                    })
        
        if resolution_times:
            stats['avg_resolution_time_hours'] = round(sum(resolution_times) / len(resolution_times), 1)
            
        total_resolved = stats['resolved']
        if total_resolved > 0:
            stats['efficiency']['ai_resolution_rate'] = round((ai_resolved_count / total_resolved) * 100)
            stats['efficiency']['human_resolution_rate'] = 100 - stats['efficiency']['ai_resolution_rate']
            
        try:
            llm_insights = await generate_dashboard_insights(stats)
            if llm_insights:
                stats['insights'] = llm_insights
                _stats_cache["data"] = stats
                _stats_cache["timestamp"] = datetime.utcnow()
                return stats
        except Exception as e:
            logger.warning(f"LLM Insights failed, using rule-based fallback: {e}")

        insights = []
        
        if stats['total'] > limit * 0.9:
            insights.append({
                "type": "warning",
                "title": "High Incident Volume",
                "message": "Incident buffer is full. Unusually high activity detected.",
                "action": "Check System Health"
            })
            
        if stats['critical'] > 5:
            insights.append({
                "type": "alert",
                "title": "Critical Severity Spike",
                "message": f"{stats['critical']} critical incidents detected. Immediate triage recommended.",
                "action": "View Critical Queue"
            })
            
        top_cat = max(stats['distributions']['category'].items(), key=lambda x: x[1]) if stats['distributions']['category'] else ("None", 0)
        if top_cat[1] > stats['total'] * 0.4:
              insights.append({
                "type": "info",
                "title": f"Category Focus: {top_cat[0]}",
                "message": f"{round(top_cat[1]/stats['total']*100)}% of incidents are related to {top_cat[0]}.",
                "action": "Analyze Root Cause"
            })
            
        if stats['efficiency']['ai_resolution_rate'] > 40:
              insights.append({
                "type": "success",
                "title": "High AI Efficacy",
                "message": "AI Agents are resolving >40% of tickets autonomously.",
                "action": "Review Agent Logs"
            })
            
        if not insights:
            insights.append({"type": "success", "title": "System Stable", "message": "No functional anomalies detected in the last window.", "action": "View Logs"})
            
        stats['insights'] = insights

        _stats_cache["data"] = stats
        _stats_cache["timestamp"] = datetime.utcnow()

        return stats
        
    except Exception as e:
        logger.error(f"Stats Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics")

@router.get("/reports/incidents/analysis")
async def generate_incident_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.check_admin_role)
):
    try:
        from ...services.servicenow_service import servicenow_service
   
        incidents = await servicenow_service.get_incidents(limit=100)
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        p.setFont("Helvetica-Bold", 24)
        p.drawString(50, height - 50, "Incident Analysis Report")
        p.setFont("Helvetica", 12)
        p.drawString(50, height - 70, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        y = height - 120
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "Executive Summary")
        y -= 25
        p.setFont("Helvetica", 12)
        total = len(incidents)
        critical = sum(1 for i in incidents if i.get('priority') == '1')
        resolved = sum(1 for i in incidents if i.get('state') in ['6', '7'])
        
        p.drawString(50, y, f"Total Incidents Analysis: {total}")
        y -= 20
        p.drawString(50, y, f"Critical Severity: {critical}")
        y -= 20
        p.drawString(50, y, f"Resolved Incidents: {resolved}")
        y -= 20
        efficiency = int((resolved/total)*100) if total > 0 else 0
        p.drawString(50, y, f"Resolution Efficiency: {efficiency}%")
        
        y -= 40
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "AI Detected Insights")
        y -= 25
        p.setFont("Helvetica", 10)
        
        insights = []
        if critical > 5: insights.append("- CRITICAL SPIKE detected in incident flow.")
        elif critical > 0: insights.append("- Critical incidents present. Immediate attention advised.")
        
        if efficiency < 50: insights.append("- LOW RESOLUTION rate observed. Agent augmentation recommended.")
        else: insights.append("- Healthy resolution rate maintained by AI/Human workforce.")
        
        from collections import Counter
        cats = [i.get('category', 'unknown') for i in incidents]
        if cats:
            top = Counter(cats).most_common(1)[0]
            insights.append(f"- Dominant Incident Category: {top[0]} ({top[1]} tickets)")

        for ins in insights:
            p.drawString(60, y, ins)
            y -= 15
            
        y -= 40
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y, "Recent Critical/High Incidents")
        y -= 25
        
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "ID")
        p.drawString(120, y, "Summary")
        p.drawString(450, y, "Status")
        y -= 5
        p.line(50, y, 550, y)
        y -= 15
        
        p.setFont("Helvetica", 9)
        high_prio = [i for i in incidents if i.get('priority') in ['1', '2']][:15]
        
        if not high_prio:
            p.drawString(50, y, "No recent high priority incidents found.")
        
        for inc in high_prio:
            id_ = inc.get('number', 'N/A')
            desc = inc.get('short_description', 'No description')[:60] + "..."
            state_map = {"1": "New", "2": "In Progress", "6": "Resolved"}
            st = state_map.get(inc.get('state', '1'), "Other")
            
            p.drawString(50, y, id_)
            p.drawString(120, y, desc)
            p.drawString(450, y, st)
            y -= 15
            
            if y < 50: # Page break
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 9)
                
        p.showPage()
        p.save()
        
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=incident_analysis.pdf"}
        )

    except Exception as e:
        logger.error(f"Report Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")