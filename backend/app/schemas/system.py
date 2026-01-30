from pydantic import BaseModel
from typing import Optional

class UpdateSettingRequest(BaseModel):
    value: str

class TestConnectionRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
