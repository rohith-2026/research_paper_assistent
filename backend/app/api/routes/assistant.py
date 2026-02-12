# app/api/routes/assistant.py
import os
from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    Query,
    Path,
)

from app.api.deps import get_current_user
from app.schemas.assistant import AnalyzeTextRequest, AnalyzeResponse
from app.schemas.history import HistoryResponse

from app.services.file_service import save_upload
from app.services.pdf_service import extract_text_from_pdf
from app.services.docx_service import extract_text_from_docx

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# -----------------------------
# 1) Quick analyze (top-k only)
# -----------------------------
@router.post("/analyze-text", response_model=AnalyzeResponse)
async def analyze_text(payload: AnalyzeTextRequest, user=Depends(get_current_user)):
    from app.main import assistant_service  # global singleton

    topics = assistant_service.analyze_text(payload.text, top_k=5)

    saved_id = await assistant_service.record_quick_analysis(
        user_id=str(user["_id"]),
        input_type="text",
        input_text=payload.text,
        file_meta=None,
        predicted_topics=topics,
    )

    return {
        "input_type": "text",
        "predicted_topics": topics,
        "saved_query_id": saved_id,
    }


@router.post("/analyze-file", response_model=AnalyzeResponse)
async def analyze_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    from app.main import assistant_service

    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "storage", "uploads")
    )
    saved_path = save_upload(file, upload_dir)

    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(saved_path)
    elif ext == ".docx":
        text = extract_text_from_docx(saved_path)
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX supported")

    if not text or len(text) < 10:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    topics = assistant_service.analyze_text(text, top_k=5)

    saved_id = await assistant_service.record_quick_analysis(
        user_id=str(user["_id"]),
        input_type="file",
        input_text=text[:20000],
        file_meta={"filename": file.filename, "content_type": file.content_type},
        predicted_topics=topics,
    )

    return {
        "input_type": "file",
        "predicted_topics": topics,
        "saved_query_id": saved_id,
    }


# -----------------------------------
# 2) Full assistant pipeline (NEW OK)
# -----------------------------------
@router.post("/query-text")
async def query_text(payload: AnalyzeTextRequest, user=Depends(get_current_user)):
    from app.main import assistant_service
    return await assistant_service.run_query(
        user_id=str(user["_id"]),
        text=payload.text,
    )


@router.post("/query-file")
async def query_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    from app.main import assistant_service

    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "storage", "uploads")
    )
    saved_path = save_upload(file, upload_dir)

    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(saved_path)
    elif ext == ".docx":
        text = extract_text_from_docx(saved_path)
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX supported")

    if not text or len(text) < 10:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    return await assistant_service.run_query(
        user_id=str(user["_id"]),
        text=text[:20000],
        input_type="file",
    )


# -----------------------------
# 3) History (Pagination + Total)
# -----------------------------
# -----------------------------
# 3) History (Pagination + Total)
# -----------------------------
@router.get("/history", response_model=HistoryResponse)
async def history(
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    """
    Returns history saved by /query-text and /query-file
    Pagination:
      - skip
      - limit

    OK Normalizes old records (/analyze-text and /analyze-file)
       into the new schema so Pydantic validation never fails.
    """
    uid = user["_id"]
    from app.main import assistant_service

    total, rows = await assistant_service.history_paginated(
        user_id=str(uid),
        limit=limit,
        skip=skip,
    )

    items = []
    for q in rows:
        q_id = str(q["_id"])
        created_at = q.get("created_at")

        # OK Case 1: NEW format (run_query pipeline)
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

        # OK Case 2: OLD format (/analyze-text & /analyze-file)
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



# -----------------------------
# 4) Delete single history item
# -----------------------------
@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: str = Path(..., description="MongoDB history document id"),
    user=Depends(get_current_user),
):
    uid = user["_id"]
    from app.main import assistant_service

    if not ObjectId.is_valid(history_id):
        raise HTTPException(status_code=400, detail="Invalid history_id")

    res = await assistant_service.delete_history_item(
        user_id=str(uid),
        history_id=ObjectId(history_id),
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History item not found")

    return {"deleted": True, "history_id": history_id}


# -----------------------------
# 5) Delete ALL history of user
# -----------------------------
@router.delete("/history")
async def delete_all_history(user=Depends(get_current_user)):
    uid = user["_id"]
    from app.main import assistant_service
    res = await assistant_service.delete_all_history(user_id=str(uid))
    return {"deleted": True, "deleted_count": res.deleted_count}
