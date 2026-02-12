from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.schemas.collections import CollectionItemCreateRequest, CollectionItemResponse
from app.services.collection_service import CollectionService

router = APIRouter(prefix="/collections", tags=["CollectionItems"])


@router.get("/{collection_id}/items", response_model=list[CollectionItemResponse])
async def list_items(collection_id: str, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        return await service.list_items(str(user["_id"]), collection_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{collection_id}/items", response_model=CollectionItemResponse)
async def add_item(collection_id: str, payload: CollectionItemCreateRequest, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        return await service.add_item(
            user_id=str(user["_id"]),
            collection_id=collection_id,
            paper_id=payload.paper_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{collection_id}/items/{paper_id}")
async def remove_item(collection_id: str, paper_id: str, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        ok = await service.remove_item(str(user["_id"]), collection_id, paper_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
