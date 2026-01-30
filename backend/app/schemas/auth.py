from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    role: Optional[str] = "user"

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    role: Optional[str] = None
    workflow_id: Optional[str] = None
