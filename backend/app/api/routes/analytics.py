from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import get_current_user
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(user=Depends(get_current_user)):
    service = AnalyticsService()
    return await service.overview(user["_id"])


@router.get("/subjects")
async def analytics_subjects(
    start_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    user=Depends(get_current_user),
):
    service = AnalyticsService()
    try:
        start, end = service.parse_dates(start_date, end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    return await service.subjects(user["_id"], start=start, end=end)


@router.get("/confidence")
async def analytics_confidence(
    start_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    user=Depends(get_current_user),
):
    service = AnalyticsService()
    try:
        start, end = service.parse_dates(start_date, end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    return await service.confidence(user["_id"], start=start, end=end)


@router.get("/api-usage")
async def analytics_api_usage(
    start_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    end_date: str | None = Query(default=None, description="YYYY-MM-DD"),
    user=Depends(get_current_user),
):
    service = AnalyticsService()
    return await service.api_usage(user["_id"], start_date=start_date, end_date=end_date)
