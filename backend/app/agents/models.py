from pydantic import BaseModel
from typing import Optional, List, Literal, Dict, Any

class SupportResponse(BaseModel):
    reasoning: str
    missing_info: List[str]
    extracted_email: Optional[str] = None
    extracted_priority: Optional[str] = None
    extracted_description: Optional[str] = None
    extracted_occurrence: Optional[str] = None  
    extracted_details: Optional[str] = None
    extracted_category: Optional[str] = None
    extracted_short_description: Optional[str] = None
    extracted_availability: Optional[str] = None  # When user is available for contact
    extracted_contact_preference: Optional[str] = None  # Phone, email, etc.
    extracted_location: Optional[str] = None  # Physical address or area
    response: str
    intent: Literal["escalate", "technical", "analyze", "chat", "lookup", "system_health", "out_of_scope", "end"]
    all_details_given: bool = False 

class TicketResponse(BaseModel):
    incident_id: Optional[str] = None
    servicenow_id: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    approved: Optional[bool] = None
    lookup_summary: Optional[str] = None
    action_taken: Optional[str] = None
    details: Optional[Dict[str, Any]] = None 

class AgentDeps(BaseModel):
    thread_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None 
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    user_address: Optional[str] = None
    workflow_id: Optional[str] = None
    current_date: Optional[str] = None 

class DashboardInsight(BaseModel):
    type: str  # warning, alert, info, success
    title: str
    message: str
    action: str

class DashboardInsightsResponse(BaseModel):
    insights: List[DashboardInsight]

