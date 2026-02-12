from datetime import datetime
from pydantic import BaseModel, Field


class CollectionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CollectionRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CollectionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: datetime
    position: int | None = None
    tags: list[str] = []


class CollectionItemCreateRequest(BaseModel):
    paper_id: str


class CollectionItemResponse(BaseModel):
    id: str
    collection_id: str
    paper_id: str
    added_at: datetime


class CollectionReorderRequest(BaseModel):
    ordered_ids: list[str]


class CollectionTagsRequest(BaseModel):
    tags: list[str] = Field(default_factory=list, max_length=30)
