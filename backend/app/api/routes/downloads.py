from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.schemas.downloads import DownloadCreateRequest, DownloadResponse
from app.services.download_service import DownloadService

router = APIRouter(prefix="/downloads", tags=["Downloads"])


@router.get("", response_model=list[DownloadResponse])
async def list_downloads(user=Depends(get_current_user)):
    service = DownloadService()
    return await service.list_for_user(str(user["_id"]))


@router.post("", response_model=DownloadResponse)
async def record_download(payload: DownloadCreateRequest, user=Depends(get_current_user)):
    service = DownloadService()
    try:
        return await service.record(
            user_id=str(user["_id"]),
            paper_id=payload.paper_id,
            fmt=payload.format,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
