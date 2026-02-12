from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.feedback_repo import FeedbackRepo
from app.repositories.analytics_repo import AnalyticsRepo


def now_utc():
    return now_ist()


class FeedbackService:
    def __init__(self, db=None):
        self.feedback = FeedbackRepo(db=db)
        self.analytics = AnalyticsRepo(db=db)

    async def list_for_user(self, user_id: str):
        rows = await self.feedback.by_user(ObjectId(user_id))
        return [self._serialize(r) for r in rows]

    async def create(self, user_id: str, ftype: str, message: str, attachments: list[str] | None = None):
        doc = {
            "user_id": ObjectId(user_id),
            "type": ftype,
            "message": (message or "").strip(),
            "attachments": attachments or [],
            "created_at": now_utc(),
        }
        res = await self.feedback.insert(doc)
        doc["_id"] = res.inserted_id
        await self.analytics.emit(
            ObjectId(user_id),
            "feedback",
            {"type": ftype},
        )
        return self._serialize(doc)

    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        if "attachments" not in doc:
            doc["attachments"] = []
        return doc
