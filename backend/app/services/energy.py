import os
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Ticket, TroubleshootingEntry, TechnicalData, init_db

init_db()

class EnergyService:
    def create_ticket(self, subject: str, description: str, priority: str, email: str, approved: bool = False, user_id: Optional[str] = None) -> str:
        """Creates a new ticket and returns the incident ID."""
        db = SessionLocal()
        try:
            incident_id = f"TIC-{uuid.uuid4().hex[:6].upper()}"
            ticket = Ticket(
                incident_id=incident_id,
                user_id=user_id,
                subject=subject,
                description=description,
                priority=priority,
                email=email,
                approved=approved,
                status="reported"
            )
            db.add(ticket)
            db.commit()
            return incident_id

        finally:
            db.close()

    def get_ticket(self, incident_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.incident_id == incident_id).first()
            if not ticket:
                return None
            return {
                "incident_id": ticket.incident_id,
                "subject": ticket.subject,
                "description": ticket.description,
                "priority": ticket.priority,
                "email": ticket.email,
                "status": ticket.status,
                "approved": ticket.approved,
                "created_at": ticket.created_at.isoformat(),
                "analysis": ticket.analysis
            }
        finally:
            db.close()
    
    def update_servicenow_id(self, incident_id: str, servicenow_id: str):
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.incident_id == incident_id).first()
            if ticket:
                ticket.servicenow_id = servicenow_id
                db.commit()
        finally:
            db.close()

    def update_ticket_analysis(self, incident_id: str, analysis: str):
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.incident_id == incident_id).first()
            if ticket:
                ticket.analysis = analysis
                ticket.status = "analyzed"
                db.commit()
        finally:
            db.close()

    def search_knowledge_base(self, query: str) -> List[Dict[str, str]]:
        """Simple keyword search in troubleshooting entries."""
        db = SessionLocal()
        try:
            query_terms = query.lower().split()
            all_entries = db.query(TroubleshootingEntry).all()
            results = []
            for entry in all_entries:
                text = (entry.issue + " " + entry.solution).lower()
                if any(term in text for term in query_terms):
                    results.append({"issue": entry.issue, "solution": entry.solution})
            return results
        finally:
            db.close()

    def get_customer_info(self, email: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            customer = db.query(TechnicalData).filter(TechnicalData.email == email).first()
            return customer.data if customer else None
        finally:
            db.close()

energy_service = EnergyService()
