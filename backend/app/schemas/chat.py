from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_id: Optional[str] = None
    workflow_id: Optional[str] = None
    agent_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    agent: str
