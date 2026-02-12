import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.dependencies import get_current_user
from app.schemas.feedback import FeedbackCreateRequest, FeedbackResponse
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.get("", response_model=list[FeedbackResponse])
async def list_feedback(user=Depends(get_current_user)):
    service = FeedbackService()
    return await service.list_for_user(str(user["_id"]))


@router.post("", response_model=FeedbackResponse)
async def create_feedback(payload: FeedbackCreateRequest, user=Depends(get_current_user)):
    service = FeedbackService()
    try:
        return await service.create(
            user_id=str(user["_id"]),
            ftype=payload.type,
            message=payload.message,
            attachments=payload.attachments,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/attachments")
async def upload_attachment(file: UploadFile = File(...), user=Depends(get_current_user)):
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "feedback")
    os.makedirs(uploads_dir, exist_ok=True)
    safe_name = f"{user['_id']}_{file.filename}"
    path = os.path.abspath(os.path.join(uploads_dir, safe_name))
    with open(path, "wb") as f:
        f.write(await file.read())
    return {"filename": safe_name, "url": f"/feedback/attachments/{safe_name}"}


@router.get("/attachments/{filename}")
async def get_attachment(filename: str, user=Depends(get_current_user)):
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "feedback")
    path = os.path.abspath(os.path.join(uploads_dir, filename))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
