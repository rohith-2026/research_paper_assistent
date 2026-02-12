from datetime import datetime
from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    paper_id: str
    content: str = Field(min_length=1)


class NoteUpdateRequest(BaseModel):
    content: str = Field(min_length=1)


class NoteResponse(BaseModel):
    id: str
    user_id: str
    paper_id: str
    content: str
    created_at: datetime
    updated_at: datetime | None = None
