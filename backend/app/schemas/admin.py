from pydantic import BaseModel
from typing import Optional, List

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    config: dict

class UpdateAgentRequest(BaseModel):
    systemPrompt: Optional[str] = None
    name: Optional[str] = None
    priority: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    tools: Optional[List[str]] = None
