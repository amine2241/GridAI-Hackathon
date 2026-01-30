from datetime import datetime, timedelta
from collections import defaultdict, Counter
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger
from ...core import auth
from ...core.database import User, get_db

router = APIRouter()

@router.get("/stats/incidents")
async def get_incident_stats(
    days: int = 7,
    limit: int = 200, # Fetch last 200 for analysis
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
                "ai_avg_time": "2m", # Mock baseline
                "human_avg_time": "4h"
            },
            "distributions": {
                "priority": defaultdict(int),
                "status": defaultdict(int),
                "category": defaultdict(int)
            },
            "timeline": defaultdict(int), # Date -> Count
            "heatmap": [], # List of {day, hour, value}
            "insights": []
        }

        heatmap_grid = defaultdict(int) # (day_index, hour) -> count
        
        resolution_times = []
        ai_resolved_count = 0
        human_resolved_count = 0
        
        for inc in incidents:
            state = inc.get('state', '1') # 1=New, 6=Resolved, 7=Closed
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
            for h in range(0, 24, 2): # 2-hour blocks to reduce data size
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
            from ...services.analytics_service import generate_dashboard_insights
            llm_insights = await generate_dashboard_insights(stats)
            if llm_insights:
                stats['insights'] = llm_insights
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

        return stats
        
    except Exception as e:
        logger.error(f"Stats Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics")
