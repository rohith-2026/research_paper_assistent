from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class AnalyzeTextRequest(BaseModel):
    text: str = Field(min_length=10)


class TopicScore(BaseModel):
    label: str
    score: float


class AnalyzeResponse(BaseModel):
    input_type: str
    predicted_topics: List[TopicScore]
    saved_query_id: Optional[str] = None
class PaperItem(BaseModel):
    paper_uid: Optional[str] = None
    title: str
    abstract: Optional[str] = "NOT_AVAILABLE"
    url: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    source: Optional[str] = None

class AssistantTextRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=20000)


class AssistantResponse(BaseModel):
    subject_area: str
    model_confidence: float
    top_papers: List[PaperItem]
    gpt_answer: str
    meta: Dict[str, Any] = {}
class PredictionItem(BaseModel):
    label: str
    score: float
class PapersOnlyResponse(BaseModel):
    papers: List[PaperItem]
