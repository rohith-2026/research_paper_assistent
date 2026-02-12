# app/schemas/history.py
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HistoryItem(BaseModel):
    model_config = ConfigDict(extra="allow")  # OK allow old docs fields

    id: str
    user_id: str
    created_at: Optional[datetime] = None

    # OK NEW pipeline fields (query-text/query-file)
    text: Optional[str] = None
    subject_area: Optional[str] = None
    confidence: Optional[float] = None
    top_predictions: Optional[List[Dict[str, Any]]] = None
    papers: Optional[List[Dict[str, Any]]] = None
    gpt_answer: Optional[str] = None

    # OK OLD analyze fields (analyze-text/analyze-file)
    input_type: Optional[str] = None
    input_text: Optional[str] = None
    predicted_topics: Optional[List[Dict[str, Any]]] = None
    file: Optional[Dict[str, Any]] = None


class HistoryResponse(BaseModel):
    items: List[HistoryItem]
    total: int
    limit: int
