from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.core.dependencies import get_current_user
from app.schemas.graph import GraphResponse, GraphQueryResponse, GraphQueryNode, GraphQueryEdge
from app.services.paper_graph_service import PaperGraphService
from app.repositories.query_repo import QueryRepo

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/{query_id}", response_model=GraphQueryResponse)
async def graph_for_query_simple(query_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query_id")

    repo = QueryRepo()
    doc = await repo.get_by_id(ObjectId(query_id), ObjectId(user["_id"]))
    if not doc:
        raise HTTPException(status_code=404, detail="Query not found")

    papers = doc.get("papers") or []
    nodes: list[GraphQueryNode] = []
    seen = set()
    for p in papers:
        uid = p.get("paper_uid")
        if not uid or uid in seen:
            continue
        seen.add(uid)
        nodes.append(
            GraphQueryNode(
                id=uid,
                title=p.get("title") or "Untitled",
                year=p.get("year"),
                venue=p.get("venue"),
                authors=p.get("authors"),
                source=p.get("source"),
                url=p.get("url"),
            )
        )
        if len(nodes) >= 100:
            break

    edges: list[GraphQueryEdge] = []
    n = len(nodes)
    for i in range(n):
        a = nodes[i]
        authors_a = {x.strip().lower() for x in (a.authors or []) if x and str(x).strip()}
        venue_a = (a.venue or "").strip().lower()
        year_a = a.year
        for j in range(i + 1, n):
            b = nodes[j]
            authors_b = {x.strip().lower() for x in (b.authors or []) if x and str(x).strip()}
            venue_b = (b.venue or "").strip().lower()
            year_b = b.year

            weight = 0.0
            if authors_a and authors_b and authors_a.intersection(authors_b):
                weight += 1.0
            if venue_a and venue_b and venue_a == venue_b:
                weight += 1.0
            if year_a and year_b and abs(int(year_a) - int(year_b)) == 1:
                weight += 1.0

            if weight > 0:
                edges.append(
                    GraphQueryEdge(
                        source=a.id,
                        target=b.id,
                        weight=weight,
                        type="similarity",
                    )
                )

    return GraphQueryResponse(nodes=nodes, edges=edges)


@router.get("/query/{query_id}", response_model=GraphResponse)
async def graph_for_query(query_id: str, user=Depends(get_current_user)):
    service = PaperGraphService()
    try:
        return await service.build_from_query(str(user["_id"]), query_id)
    except ValueError as e:
        detail = str(e)
        if detail == "Query not found":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)


@router.get("/paper/{paper_id}", response_model=GraphResponse)
async def graph_for_paper(
    paper_id: str,
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    service = PaperGraphService()
    try:
        return await service.get_graph_for_paper(str(user["_id"]), paper_id, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/neighbors/{paper_id}")
async def graph_neighbors(
    paper_id: str,
    limit: int = Query(20, ge=1, le=200),
    user=Depends(get_current_user),
):
    service = PaperGraphService()
    return await service.get_neighbors(paper_id, limit=limit)
