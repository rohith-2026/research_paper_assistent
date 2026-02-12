from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.admin_session_repo import AdminSessionRepo


def now_utc():
    return now_ist()


class AdminSessionService:
    def __init__(self, db=None):
        self.sessions = AdminSessionRepo(db=db)

    async def list_for_user(self, user_id: str):
        rows = await self.sessions.by_user(ObjectId(user_id))
        return [self._serialize(r) for r in rows]

    async def create(self, user_id: str, refresh_token_id: str):
        if not ObjectId.is_valid(refresh_token_id):
            raise ValueError("Invalid refresh token id")
        doc = {
            "user_id": ObjectId(user_id),
            "refresh_token_id": ObjectId(refresh_token_id),
            "created_at": now_utc(),
        }
        res = await self.sessions.insert(doc)
        doc["id"] = str(res.inserted_id)
        return doc

    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        if "refresh_token_id" in doc:
            doc["refresh_token_id"] = str(doc["refresh_token_id"])
        return doc
