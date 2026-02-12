from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.core.dependencies import get_current_user
from app.db.mongo import queries_col

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
async def history(
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    from app.main import assistant_service
    total, rows = await assistant_service.history_paginated(
        user_id=str(user["_id"]),
        limit=limit,
        skip=skip,
    )
    items = []
    for q in rows:
        q_id = str(q["_id"])
        created_at = q.get("created_at")

        if "text" in q and "subject_area" in q:
            items.append(
                {
                    "id": q_id,
                    "user_id": str(q.get("user_id")),
                    "text": q.get("text"),
                    "input_type": q.get("input_type") or "text",
                    "subject_area": q.get("subject_area"),
                    "confidence": q.get("confidence"),
                    "top_predictions": q.get("top_predictions") or [],
                    "papers": q.get("papers") or [],
                    "gpt_answer": q.get("gpt_answer"),
                    "created_at": created_at,
                }
            )
            continue

        predicted = q.get("predicted_topics") or []
        subject_area = predicted[0]["label"] if predicted else None
        confidence = predicted[0]["score"] if predicted else None

        items.append(
            {
                "id": q_id,
                "user_id": str(q.get("user_id")),
                "text": q.get("input_text") or "",
                "input_type": q.get("input_type") or "text",
                "subject_area": subject_area or "unknown",
                "confidence": float(confidence) if confidence is not None else 0.0,
                "top_predictions": predicted,
                "papers": [],
                "gpt_answer": None,
                "created_at": created_at,
            }
        )

    return {"items": items, "total": total, "limit": limit}


@router.get("/{query_id}")
async def history_by_id(query_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail="Invalid query id")

    query = await queries_col.find_one(
        {"_id": ObjectId(query_id), "user_id": ObjectId(user["_id"])}
    )
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    query["id"] = str(query.pop("_id"))
    query["user_id"] = str(query["user_id"])
    return query


@router.delete("/{history_id}")
async def delete_history_item(history_id: str, user=Depends(get_current_user)):
    from app.main import assistant_service

    if not ObjectId.is_valid(history_id):
        raise HTTPException(status_code=400, detail="Invalid history_id")

    res = await assistant_service.delete_history_item(
        user_id=str(user["_id"]), history_id=ObjectId(history_id)
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"deleted": True, "history_id": history_id}


@router.delete("")
async def delete_all_history(user=Depends(get_current_user)):
    from app.main import assistant_service
    res = await assistant_service.delete_all_history(user_id=str(user["_id"]))
    return {"deleted": True, "deleted_count": res.deleted_count}
