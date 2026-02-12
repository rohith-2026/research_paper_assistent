from pydantic import BaseModel, Field
from pydantic import ConfigDict
from typing import List, Optional


class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "paper"


class GraphEdge(BaseModel):
    from_: str = Field(alias="from")
    to: str
    weight: float = 0.0
    relation: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class GraphQueryNode(BaseModel):
    id: str
    title: str
    year: Optional[int] = None
    venue: Optional[str] = None
    authors: Optional[List[str]] = None
    source: Optional[str] = None
    url: Optional[str] = None


class GraphQueryEdge(BaseModel):
    source: str
    target: str
    weight: float = 0.0
    type: str = "similarity"


class GraphQueryResponse(BaseModel):
    nodes: List[GraphQueryNode]
    edges: List[GraphQueryEdge]
