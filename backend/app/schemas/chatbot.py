from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime | None = None
    last_used_at: datetime | None = None


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    role: str
    content: str
    meta: dict
    created_at: datetime | None = None


class ChatAskRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1)
    paper_ids: Optional[List[str]] = None


class ChatAskResponse(BaseModel):
    answer: str
    sources: List[str]


class ChatSessionUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
