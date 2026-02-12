from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.download_repo import DownloadRepo
from app.repositories.analytics_repo import AnalyticsRepo


def now_utc():
    return now_ist()


class DownloadService:
    def __init__(self, db=None):
        self.downloads = DownloadRepo(db=db)
        self.analytics = AnalyticsRepo(db=db)

    async def list_for_user(self, user_id: str):
        rows = await self.downloads.by_user(ObjectId(user_id))
        return [self._serialize(r) for r in rows]

    async def record(self, user_id: str, paper_id: str, fmt: str):
        if not ObjectId.is_valid(paper_id):
            raise ValueError("Invalid paper id")
        doc = {
            "user_id": ObjectId(user_id),
            "paper_id": ObjectId(paper_id),
            "format": fmt,
            "created_at": now_utc(),
        }
        res = await self.downloads.insert(doc)
        doc["_id"] = res.inserted_id
        await self.analytics.emit(
            ObjectId(user_id),
            "download",
            {"paper_id": paper_id, "format": fmt},
        )
        return self._serialize(doc)

    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        doc["paper_id"] = str(doc["paper_id"])
        return doc
