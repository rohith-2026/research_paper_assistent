from fastapi import APIRouter, Depends, Query, HTTPException
from bson import ObjectId

from app.api.deps import get_current_user
from app.services.paper_service import PaperService
from app.schemas.papers import PaperSaveRequest
from app.db.mongo import queries_col

router = APIRouter(prefix="/papers", tags=["Papers"])


@router.get("/saved")
async def saved_papers(
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    service = PaperService()
    papers = await service.list_saved(str(user["_id"]), limit=limit, skip=skip)

    results = []
    for p in papers:
        p["id"] = str(p["_id"])
        del p["_id"]
        p["user_id"] = str(p["user_id"])
        if "query_id" in p:
            p["query_id"] = str(p["query_id"])
        results.append(p)

    return results


@router.post("/save")
async def save_paper(payload: PaperSaveRequest, user=Depends(get_current_user)):
    service = PaperService()
    try:
        doc = await service.save_paper(str(user["_id"]), payload.model_dump())
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        if "query_id" in doc:
            doc["query_id"] = str(doc["query_id"])
        return doc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/by-query")
async def papers_by_query(
    query_id: str = Query(..., description="Query document id"),
    limit: int = Query(default=10, ge=1, le=20),
    user=Depends(get_current_user),
):
    service = PaperService()
    try:
        rows = await service.list_by_query(str(user["_id"]), query_id, limit=limit)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid query id")

    results = []
    for p in rows:
        p["id"] = str(p.pop("_id"))
        p["user_id"] = str(p["user_id"])
        if "query_id" in p:
            p["query_id"] = str(p["query_id"])
        results.append(p)
    return results


@router.get("/queries/{query_id}/papers/{paper_uid}")
async def get_paper_detail(
    query_id: str,
    paper_uid: str,
    user=Depends(get_current_user),
):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    query = await queries_col.find_one(
        {
            "_id": ObjectId(query_id),
            "user_id": ObjectId(user["_id"]),
            "papers.paper_uid": paper_uid,
        }
    )

    if not query:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper = next(
        p for p in query.get("papers", [])
        if p.get("paper_uid") == paper_uid
    )

    return paper
