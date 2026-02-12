from pydantic import BaseModel
from typing import List, Dict

class StatCard(BaseModel):
    label: str
    value: int | float

class SubjectStat(BaseModel):
    subject: str
    count: int

class AnalyticsOverview(BaseModel):
    total_queries: int
    avg_confidence: float
    total_downloads: int
    total_summaries: int
    total_chat_messages: int

class AnalyticsResponse(BaseModel):
    overview: AnalyticsOverview
    subjects: List[SubjectStat]
