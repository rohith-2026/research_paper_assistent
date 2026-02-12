from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.api_usage import ApiUsageResponse
from app.services.api_usage_service import ApiUsageService

router = APIRouter(prefix="/api-usage", tags=["APIUsage"])


@router.get("", response_model=list[ApiUsageResponse])
async def list_api_usage(user=Depends(get_current_user)):
    service = ApiUsageService()
    return await service.list_for_user(str(user["_id"]))
