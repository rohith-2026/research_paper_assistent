from datetime import datetime
from typing import Optional, List, Literal, Any, Dict

from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    title: Optional[str] = Field(default="New session", max_length=120)


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreateRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=20000)
    meta: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    meta: Dict[str, Any] = {}
    created_at: datetime


class SessionWithMessagesResponse(BaseModel):
    session: SessionResponse
    messages: List[MessageResponse]
