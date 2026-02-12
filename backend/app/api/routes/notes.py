from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user
from app.schemas.notes import NoteCreateRequest, NoteUpdateRequest, NoteResponse
from app.services.notes_service import NotesService

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("/paper/{paper_id}", response_model=list[NoteResponse])
async def list_notes(paper_id: str, q: str | None = None, user=Depends(get_current_user)):
    service = NotesService()
    try:
        return await service.list_for_paper(str(user["_id"]), paper_id, query=q)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", response_model=NoteResponse)
async def create_note(payload: NoteCreateRequest, user=Depends(get_current_user)):
    service = NotesService()
    try:
        return await service.create(
            user_id=str(user["_id"]),
            paper_id=payload.paper_id,
            content=payload.content,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{note_id}")
async def update_note(note_id: str, payload: NoteUpdateRequest, user=Depends(get_current_user)):
    service = NotesService()
    try:
        ok = await service.update(
            user_id=str(user["_id"]),
            note_id=note_id,
            content=payload.content,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"updated": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{note_id}")
async def delete_note(note_id: str, user=Depends(get_current_user)):
    service = NotesService()
    try:
        ok = await service.delete(user_id=str(user["_id"]), note_id=note_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"deleted": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
