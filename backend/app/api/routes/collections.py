from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.schemas.collections import (
    CollectionCreateRequest,
    CollectionRenameRequest,
    CollectionResponse,
    CollectionReorderRequest,
    CollectionTagsRequest,
)
from app.services.collection_service import CollectionService

router = APIRouter(prefix="/collections", tags=["Collections"])


@router.get("", response_model=list[CollectionResponse])
async def list_collections(user=Depends(get_current_user)):
    service = CollectionService()
    return await service.list_collections(str(user["_id"]))


@router.post("", response_model=CollectionResponse)
async def create_collection(payload: CollectionCreateRequest, user=Depends(get_current_user)):
    service = CollectionService()
    return await service.create_collection(
        user_id=str(user["_id"]),
        name=payload.name,
    )


@router.put("/{collection_id}")
async def rename_collection(collection_id: str, payload: CollectionRenameRequest, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        ok = await service.rename_collection(
            user_id=str(user["_id"]),
            collection_id=collection_id,
            name=payload.name,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"updated": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{collection_id}/tags")
async def update_collection_tags(collection_id: str, payload: CollectionTagsRequest, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        ok = await service.update_tags(
            user_id=str(user["_id"]),
            collection_id=collection_id,
            tags=payload.tags,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"updated": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        ok = await service.delete_collection(str(user["_id"]), collection_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/reorder")
async def reorder_collections(payload: CollectionReorderRequest, user=Depends(get_current_user)):
    service = CollectionService()
    try:
        ok = await service.reorder_collections(str(user["_id"]), payload.ordered_ids)
        return {"updated": bool(ok)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
