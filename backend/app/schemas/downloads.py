from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


DownloadFormat = Literal["pdf", "bibtex", "csv", "json", "notes", "summary"]


class DownloadCreateRequest(BaseModel):
    paper_id: str
    format: DownloadFormat = "pdf"


class DownloadResponse(BaseModel):
    id: str
    user_id: str
    paper_id: str
    format: DownloadFormat
    created_at: datetime
