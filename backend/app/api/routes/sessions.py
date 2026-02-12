from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.schemas.sessions import (
    SessionCreateRequest,
    SessionResponse,
    SessionWithMessagesResponse,
    MessageCreateRequest,
    MessageResponse,
)
from app.services.session_service import SessionService


router = APIRouter(prefix="/sessions", tags=["Sessions"])


def session_doc_to_response(doc) -> SessionResponse:
    return SessionResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def message_doc_to_response(doc) -> MessageResponse:
    return MessageResponse(
        id=str(doc["_id"]),
        session_id=doc["session_id"],
        role=doc["role"],
        content=doc["content"],
        meta=doc.get("meta", {}) or {},
        created_at=doc["created_at"],
    )


@router.post("", response_model=SessionResponse)
async def create_session(
    payload: SessionCreateRequest,
    user=Depends(get_current_user),
):
    service = SessionService()
    session_id = await service.create_session(user["id"], payload.title or "New session")
    sess = await service.get_session(user["id"], session_id)
    return session_doc_to_response(sess)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(user=Depends(get_current_user)):
    service = SessionService()
    sessions = await service.list_sessions(user["id"])
    return [session_doc_to_response(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionWithMessagesResponse)
async def get_session_with_messages(session_id: str, user=Depends(get_current_user)):
    service = SessionService()
    sess = await service.get_session(user["id"], session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = await service.get_messages(user["id"], session_id)
    return SessionWithMessagesResponse(
        session=session_doc_to_response(sess),
        messages=[message_doc_to_response(m) for m in msgs],
    )


@router.post("/{session_id}/messages", response_model=MessageResponse)
async def add_message(session_id: str, payload: MessageCreateRequest, user=Depends(get_current_user)):
    service = SessionService()
    sess = await service.get_session(user["id"], session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_id = await service.add_message(
        user_id=user["id"],
        session_id=session_id,
        role=payload.role,
        content=payload.content,
        meta=payload.meta,
    )
    msg_doc = await service.get_message_by_id(user["id"], msg_id)
    return message_doc_to_response(msg_doc)


@router.delete("/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    service = SessionService()
    ok = await service.delete_session(user["id"], session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}
