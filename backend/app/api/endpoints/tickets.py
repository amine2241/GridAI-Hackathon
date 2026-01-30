from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import uuid
from loguru import logger

from ...core import auth
from ...core.database import User, Ticket, ChatSession, get_db
from ...services.servicenow_service import servicenow_service

def map_sn_to_frontend(sn_ticket: dict, db: Optional[Session] = None) -> dict:
    """Helper to map ServiceNow fields to frontend format."""
    is_accelerated = False
    if db:
        local_ticket = db.query(Ticket).filter(Ticket.servicenow_id == sn_ticket.get('number')).first()
        if local_ticket:
            is_accelerated = local_ticket.is_accelerated

    priority = "Medium"
    sn_prio = str(sn_ticket.get('priority', '3'))
    if sn_prio == '1': priority = "Critical"
    elif sn_prio == '2': priority = "High"
    elif sn_prio == '3': priority = "Medium"
    elif sn_prio == '4': priority = "Low"
    elif sn_prio == '5': priority = "Low" # Mapping 5 to Low to avoid 'Planning' confusion

    state = "New"
    sn_state = str(sn_ticket.get('state', '1'))
    if sn_state == '1': state = "New"
    elif sn_state == '2': state = "AI analysis"
    elif sn_state == '3': state = "In Progress"
    elif sn_state == '6': state = "Resolved"
    elif sn_state == '7': state = "Closed"
    elif sn_state == '8': state = "Canceled"

    return {
        "id": sn_ticket.get('number'),
        "title": sn_ticket.get('short_description') or "Untitled Incident",
        "status": state,
        "priority": priority,
        "createdAt": sn_ticket.get('sys_created_on', '').replace(' ', 'T') + "Z" if sn_ticket.get('sys_created_on') else None,
        "description": sn_ticket.get('description', ''),
        "contact_type": sn_ticket.get('contact_type', 'Virtual Agent'),
        "is_accelerated": is_accelerated
    }

router = APIRouter()

@router.get("/tickets/my", tags=["tickets"])
async def get_my_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth.get_current_user)
):
    try:
        sn_priority = None
        if priority:
            p_map = {"low": "4,5", "medium": "3", "high": "1", "planning": "5"}
            sn_priority = p_map.get(priority.lower())
            
        sn_status = None
        if status:
            s_map = {
                "all": None,
                "new": "1",
                "ai analysis": "2", 
                "in progress": "3",
                "resolved": "6",
                "closed": "7",
                "canceled": "8"
            }
            sn_status = s_map.get(status.lower())

        sn_tickets = await servicenow_service.get_user_incidents(
            current_user.email,
            status=sn_status,
            priority=sn_priority,
            search_query=search
        )
        return [map_sn_to_frontend(t, db) for t in sn_tickets]
    except Exception as e:
        logger.error(f"My Tickets Error (ServiceNow): {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tickets from ServiceNow")

@router.post("/sessions/{session_id}/finish", tags=["chat"])
async def finish_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    db.commit()
    return {"status": "success", "message": "Session finished"}

@router.get("/incidents", tags=["tickets"])
async def get_incidents(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth.get_current_user)
):
    try:
        sn_priority = None
        if priority:
            p_map = {"low": "4,5", "medium": "3", "high": "1", "planning": "5"}
            sn_priority = p_map.get(priority.lower())
            
        sn_status = None
        if status:
            s_map = {
                "all": None,
                "new": "1",
                "ai analysis": "2", 
                "in progress": "3",
                "resolved": "6",
                "closed": "7",
                "canceled": "8"
            }
            sn_status = s_map.get(status.lower())

        sn_tickets = await servicenow_service.get_incidents(
            status=sn_status,
            priority=sn_priority,
            search_query=search,
            limit=50
        )
        
        return [
            {
                "id": t.get('number'),
                "title": t.get('short_description') or "Untitled Incident",
                "status": map_sn_to_frontend(t)["status"],
                "priority": map_sn_to_frontend(t)["priority"],
                "serviceNowId": t.get('number'),
                "summary": (t.get('description', '')[:100] + "...") if t.get('description') and len(t.get('description')) > 100 else (t.get('description') or ""),
                "description": t.get('description') or "",
                "createdAt": t.get('sys_created_on', '').replace(' ', 'T') + "Z" if t.get('sys_created_on') else None,
                "agentAnalysis": [],
                "timeline": [{"action": "Incident Detected", "timestamp": t.get('sys_created_on'), "agentName": "ServiceNow"}]
            } for t in sn_tickets
        ]
    except Exception as e:
        logger.error(f"Incidents Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch incidents")
@router.get("/tickets/stats", tags=["tickets"])
async def get_ticket_stats(
    current_user: User = Depends(auth.get_current_user)
):
    """Récupère les statistiques dynamiques pour le tableau de bord utilisateur."""
    try:
        active_tickets = await servicenow_service.get_user_incidents(
            current_user.email, 
            status="active=true",
            limit=100
        )
        
        all_user_tickets = await servicenow_service.get_user_incidents(
            current_user.email,
            limit=100
        )
        total_count = len(all_user_tickets)

        latest_ticket = None
        if all_user_tickets:
            latest_ticket = map_sn_to_frontend(all_user_tickets[0])

        resolved_tickets = [t for t in all_user_tickets if t.get('state') in ['6', '7']]
        resolved_count = len(resolved_tickets)
        
        efficiency = 100
        if total_count > 0:
            efficiency = round((resolved_count / total_count) * 100)
            
        return {
            "activeCount": len(active_tickets),
            "totalCount": total_count,
            "resolvedCount": resolved_count,
            "efficiency": f"{efficiency}%",
            "latestTicket": latest_ticket,
            "systemStatus": "STABLE" if efficiency > 80 else "DEGRADED"
        }
    except Exception as e:
        logger.error(f"Error fetching ticket stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")

@router.get("/tickets/{ticket_id}/logs", tags=["tickets"])
async def get_incident_logs(
    ticket_id: str,
    current_user: User = Depends(auth.get_current_user)
):
    """Récupère l'historique complet des activités pour un incident."""
    try:
        logs = await servicenow_service.get_incident_history(ticket_id)
        return logs
    except Exception as e:
        logger.error(f"Error fetching logs for {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tickets/{ticket_id}/escalate", tags=["tickets"])
async def escalate_incident(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Déclenche une demande d'accélération/escalade technique."""
    try:
        local_ticket = db.query(Ticket).filter(Ticket.servicenow_id == ticket_id).first()
        if local_ticket and local_ticket.is_accelerated:
            return {"status": "already_escalated", "message": "Acceleration already active for this node."}

        note = f"⚠️ SYSTEM ESCALATION: User {current_user.email} requested accelerated resolution on this node."
        await servicenow_service.add_incident_note(ticket_id, note, is_work_note=False)
        
        local_ticket = db.query(Ticket).filter(Ticket.servicenow_id == ticket_id).first()
        if not local_ticket:
            local_ticket = Ticket(
                incident_id=f"LOCAL-{uuid.uuid4().hex[:6].upper()}",
                servicenow_id=ticket_id,
                is_accelerated=True,
                email=current_user.email,
                user_id=current_user.id,
                subject="Escalated Incident",
                description="Automatically tracked escalation"
            )
            db.add(local_ticket)
        else:
            local_ticket.is_accelerated = True
        
        db.commit()
 
        return {"status": "escalated", "message": "Neural priority increased."}
    except Exception as e:
        logger.error(f"Error escalating {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
