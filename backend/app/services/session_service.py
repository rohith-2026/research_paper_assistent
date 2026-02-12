# app/services/session_service.py
from datetime import datetime
from app.core.time_utils import now_ist
from typing import List, Optional, Dict, Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.chat_repo import ChatSessionRepo, ChatMessageRepo
from app.repositories.admin_session_repo import AdminSessionRepo


def now_utc() -> datetime:
    return now_ist()


def oid(x: str) -> ObjectId:
    return ObjectId(x)


class SessionService:
    """
    Chat session lifecycle service.

    Collections used:
      - chat_sessions
      - chat_messages
      - sessions_admin (read-only support)
    """

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self.sessions_repo = ChatSessionRepo(db=db)
        self.messages_repo = ChatMessageRepo(db=db)
        self.admin_sessions_repo = AdminSessionRepo(db=db)

    # -------------------------------------------------
    # Session CRUD
    # -------------------------------------------------
    async def create_session(self, user_id: str, title: str) -> str:
        now = now_utc()
        doc = {
            "user_id": oid(user_id),
            "title": title.strip()[:120],
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "last_used_at": now,
        }
        res = await self.sessions_repo.insert(doc)
        return str(res.inserted_id)

    async def list_sessions(
        self, user_id: str, limit: int = 50
    ) -> List[dict]:
        rows = await self.sessions_repo.list_for_user(oid(user_id), limit=limit)
        return [self._serialize(s) for s in rows]

    async def get_session(
        self, user_id: str, session_id: str
    ) -> Optional[dict]:
        sess = await self.sessions_repo.get_for_user(oid(user_id), oid(session_id))
        return self._serialize(sess) if sess else None

    async def archive_session(self, user_id: str, session_id: str) -> bool:
        res = await self.sessions_repo.update_status(
            oid(user_id),
            oid(session_id),
            "archived",
            now_utc(),
        )
        return res.modified_count == 1

    async def delete_session(self, user_id: str, session_id: str) -> bool:
        sess = await self.get_session(user_id, session_id)
        if not sess:
            return False

        await self.messages_repo.delete_for_user_session(
            oid(user_id), oid(session_id)
        )
        res = await self.sessions_repo.delete_one(
            {"_id": oid(session_id), "user_id": oid(user_id)}
        )
        return res.deleted_count == 1

    # -------------------------------------------------
    # Messages
    # -------------------------------------------------
    async def add_message(
        self,
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        meta: Optional[Dict[str, Any]] = None,
    ) -> str:
        now = now_utc()

        doc = {
            "user_id": oid(user_id),
            "session_id": oid(session_id),
            "role": role,
            "content": content,
            "meta": meta or {},
            "created_at": now,
        }
        res = await self.messages_repo.insert(doc)

        await self.sessions_repo.update_last_used(
            oid(user_id), oid(session_id), now
        )

        # Optional admin tracking
        await self._touch_admin_session(user_id, session_id)

        return str(res.inserted_id)

    async def get_messages(
        self,
        user_id: str,
        session_id: str,
        limit: int = 200,
    ) -> List[dict]:
        rows = await self.messages_repo.messages_for_user_session(
            oid(user_id), oid(session_id), limit=limit
        )
        return [self._serialize(m) for m in rows]

    async def get_message_by_id(
        self,
        user_id: str,
        message_id: str,
    ) -> Optional[dict]:
        msg = await self.messages_repo.get_by_id_for_user(
            oid(user_id),
            oid(message_id),
        )
        return self._serialize(msg) if msg else None

    # -------------------------------------------------
    # Admin visibility (enterprise-ready)
    # -------------------------------------------------
    async def _touch_admin_session(self, user_id: str, session_id: str):
        await self.admin_sessions_repo.touch_session(
            oid(user_id), oid(session_id), now_utc()
        )

    # -------------------------------------------------
    # Utils
    # -------------------------------------------------
    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc["id"] = str(doc.pop("_id"))
        if "user_id" in doc:
            doc["user_id"] = str(doc["user_id"])
        if "session_id" in doc:
            doc["session_id"] = str(doc["session_id"])
        return doc
