from datetime import datetime
from pydantic import BaseModel, Field


class ApiUsageResponse(BaseModel):
    id: str
    user_id: str
    endpoint: str
    date: str
    count: int = Field(ge=0)
