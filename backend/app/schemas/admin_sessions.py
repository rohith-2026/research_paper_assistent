from datetime import datetime
from pydantic import BaseModel


class AdminSessionCreateRequest(BaseModel):
    refresh_token_id: str


class AdminSessionResponse(BaseModel):
    id: str
    user_id: str
    refresh_token_id: str
    created_at: datetime
