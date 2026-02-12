from datetime import datetime
from typing import Literal, List

from pydantic import BaseModel

SummaryType = Literal["short", "detailed"]


class SummaryGenerateRequest(BaseModel):
    query_id: str
    paper_uid: str
    summary_type: SummaryType


class SummaryItem(BaseModel):
    id: str
    query_id: str
    paper_uid: str
    summary_type: SummaryType
    content: str
    created_at: datetime


class SummaryListResponse(BaseModel):
    items: List[SummaryItem]
