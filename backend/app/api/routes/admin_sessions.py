from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.schemas.admin_sessions import AdminSessionCreateRequest, AdminSessionResponse
from app.services.admin_session_service import AdminSessionService

router = APIRouter(prefix="/admin/user-sessions", tags=["AdminSessions"])


@router.get("", response_model=list[AdminSessionResponse])
async def list_admin_sessions(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    service = AdminSessionService()
    return await service.list_for_user(str(user["_id"]))


@router.post("", response_model=AdminSessionResponse)
async def create_admin_session(payload: AdminSessionCreateRequest, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    service = AdminSessionService()
    try:
        return await service.create(
            user_id=str(user["_id"]),
            refresh_token_id=payload.refresh_token_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
