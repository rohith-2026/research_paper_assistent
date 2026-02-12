from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


FeedbackType = Literal["model", "ui", "bug"]


class FeedbackCreateRequest(BaseModel):
    type: FeedbackType = "ui"
    message: str = Field(min_length=1)
    attachments: list[str] = Field(default_factory=list)


class FeedbackResponse(BaseModel):
    id: str
    user_id: str
    type: FeedbackType
    message: str
    attachments: list[str] = []
    created_at: datetime
