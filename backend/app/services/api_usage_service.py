from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.api_usage_repo import ApiUsageRepo


def now_utc():
    return now_ist()


class ApiUsageService:
    def __init__(self, db=None):
        self.api_usage = ApiUsageRepo(db=db)

    async def list_for_user(self, user_id: str, date: str | None = None):
        query = {"user_id": ObjectId(user_id)}
        if date:
            query["date"] = date
        rows = await self.api_usage.col.find(query).to_list(length=None)
        return [self._serialize(r) for r in rows]

    async def increment(self, user_id: str, endpoint: str, date: str | None = None):
        date_str = date or now_utc().strftime("%Y-%m-%d")
        await self.api_usage.update_one(
            {"user_id": ObjectId(user_id), "endpoint": endpoint, "date": date_str},
            {"$inc": {"count": 1}},
            upsert=True,
        )

    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        return doc
