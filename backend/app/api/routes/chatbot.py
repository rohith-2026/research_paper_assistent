from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.dependencies import get_current_user
from app.schemas.chatbot import ChatAskRequest, ChatAskResponse, ChatSessionResponse, ChatMessageResponse, ChatSessionUpdateRequest
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.post("/session")
async def create_session(user=Depends(get_current_user)):
    service = ChatbotService()
    session_id = await service.create_session(user_id=str(user["_id"]))
    return {"session_id": session_id}


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    user=Depends(get_current_user),
):
    service = ChatbotService()
    return await service.list_sessions(user_id=str(user["_id"]), limit=limit)


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def rename_session(session_id: str, payload: ChatSessionUpdateRequest, user=Depends(get_current_user)):
    service = ChatbotService()
    try:
        return await service.rename_session(
            user_id=str(user["_id"]),
            session_id=session_id,
            title=payload.title,
        )
    except ValueError as e:
        detail = str(e)
        if detail == "Session not found":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)


@router.get("/messages/{session_id}", response_model=list[ChatMessageResponse])
async def get_messages(session_id: str, user=Depends(get_current_user)):
    service = ChatbotService()
    return await service.get_messages(user_id=str(user["_id"]), session_id=session_id)


@router.delete("/messages/{session_id}")
async def clear_messages(session_id: str, user=Depends(get_current_user)):
    service = ChatbotService()
    try:
        return await service.clear_session_messages(
            user_id=str(user["_id"]),
            session_id=session_id,
        )
    except ValueError as e:
        detail = str(e)
        if detail == "Session not found":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)


@router.post("/message", response_model=ChatAskResponse)
async def ask_chatbot(payload: ChatAskRequest, request: Request, user=Depends(get_current_user)):
    message = payload.message
    session_id = payload.session_id
    paper_ids = payload.paper_ids or []

    service = ChatbotService()
    try:
        meta = {
            "ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "source": "api",
        }
        return await service.ask(
            user_id=str(user["_id"]),
            message=message,
            session_id=session_id,
            paper_ids=paper_ids,
            request_meta=meta,
        )
    except ValueError as e:
        detail = str(e)
        if detail == "Session not found":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    service = ChatbotService()
    try:
        return await service.delete_session(
            user_id=str(user["_id"]),
            session_id=session_id,
        )
    except ValueError as e:
        detail = str(e)
        if detail == "Session not found":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
