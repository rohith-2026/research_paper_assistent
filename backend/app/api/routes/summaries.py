from fastapi import APIRouter, Depends, HTTPException, Path
from bson import ObjectId

from app.core.dependencies import get_current_user
from app.schemas.summaries import SummaryGenerateRequest, SummaryItem, SummaryListResponse
from app.services.summary_service import SummaryService
from app.repositories.summary_repo import SummaryRepository
from app.repositories.query_repo import QueryRepo

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.post("/generate", response_model=SummaryItem)
async def generate_summary(payload: SummaryGenerateRequest, user=Depends(get_current_user)):
    if not ObjectId.is_valid(payload.query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    summary_type = (payload.summary_type or "").strip().lower()
    if summary_type not in {"short", "detailed"}:
        raise HTTPException(status_code=400, detail="Invalid summary type")

    queries = QueryRepo()
    summaries = SummaryRepository()
    summarizer = SummaryService()

    query = await queries.get_by_id(ObjectId(payload.query_id), ObjectId(user["_id"]))
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    papers = query.get("papers") or []
    paper = next((p for p in papers if p.get("paper_uid") == payload.paper_uid), None)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    abstract = (paper.get("abstract") or "").strip()
    title = (paper.get("title") or "").strip()
    source_text = abstract
    if not abstract or abstract == "NOT_AVAILABLE":
        source_text = title or "Untitled paper"

    content = await summarizer.summarize(source_text, summary_type=summary_type, title=title)
    if not content:
        raise HTTPException(status_code=400, detail="Summary generation failed")

    doc = await summaries.upsert_summary(
        user_id=str(user["_id"]),
        query_id=payload.query_id,
        paper_uid=payload.paper_uid,
        summary_type=summary_type,
        content=content,
    )
    if not doc:
        raise HTTPException(status_code=500, detail="Summary save failed")

    return SummaryItem(
        id=str(doc["_id"]),
        query_id=str(doc["query_id"]),
        paper_uid=doc["paper_uid"],
        summary_type=doc["summary_type"],
        content=doc["content"],
        created_at=doc["created_at"],
    )


@router.get(
    "/{query_id}/{paper_uid}",
    response_model=SummaryListResponse,
)
async def list_summaries(
    query_id: str = Path(..., description="Query document id"),
    paper_uid: str = Path(..., description="Paper uid"),
    user=Depends(get_current_user),
):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    summaries = SummaryRepository()
    rows = await summaries.list_summaries(
        user_id=str(user["_id"]),
        query_id=query_id,
        paper_uid=paper_uid,
    )

    items = [
        SummaryItem(
            id=str(r["_id"]),
            query_id=str(r["query_id"]),
            paper_uid=r["paper_uid"],
            summary_type=r["summary_type"],
            content=r.get("content") or "",
            created_at=r["created_at"],
        )
        for r in rows
    ]
    return SummaryListResponse(items=items)
