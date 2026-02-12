from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class PaperCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    abstract: Optional[str] = None
    file_path: Optional[str] = None
    subject_area: Optional[str] = None


class PaperResponse(BaseModel):
    id: str
    user_id: str
    title: str
    abstract: Optional[str] = None
    file_path: Optional[str] = None
    subject_area: Optional[str] = None
    created_at: datetime


class PaperSaveRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    abstract: Optional[str] = None
    url: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    source: Optional[str] = None
    subject_area: Optional[str] = None
