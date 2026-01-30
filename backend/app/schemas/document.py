from pydantic import BaseModel
from typing import Optional

class DocumentCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "General"
