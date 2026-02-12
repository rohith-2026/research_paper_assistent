from datetime import datetime
from app.core.time_utils import now_ist
import os
import asyncio
from app.db.mongo import get_db


class AnalyticsRepo:
    def __init__(self, db=None):
        self._db = db or get_db()
        self.events = self._db["analytics_events"]
        self.api_usage = self._db["api_usage"]
        self.queries = self._db["queries"]
        self.papers = self._db["papers"]
        self.users = self._db["users"]

    async def _is_opted_out(self, user_id) -> bool:
        user = await self.users.find_one({"_id": user_id}, {"analytics_opt_out": 1})
        return bool(user and user.get("analytics_opt_out"))

    async def track_event(self, user_id, event: str, meta: dict | None = None):
        if await self._is_opted_out(user_id):
            return None
        doc = {
            "user_id": user_id,
            "event": event,
            "meta": meta or {},
            "created_at": now_ist(),
        }
        return await self.events.insert_one(doc)

    async def emit(self, user_id, event: str, meta: dict | None = None):
        if os.getenv("ANALYTICS_ASYNC", "0") == "1":
            try:
                asyncio.create_task(self.track_event(user_id, event, meta))
                return None
            except RuntimeError:
                return await self.track_event(user_id, event, meta)
        return await self.track_event(user_id, event, meta)

    async def count_events(self, user_id, event: str, start: datetime | None = None, end: datetime | None = None):
        q = {"user_id": user_id, "event": event}
        if start and end:
            q["created_at"] = {"$gte": start, "$lt": end}
        return await self.events.count_documents(q)

    async def count_queries(self, user_id):
        return await self.queries.count_documents({"user_id": user_id})

    async def count_papers(self, user_id):
        return await self.papers.count_documents({"user_id": user_id})

    async def avg_confidence(self, user_id, start: datetime | None = None, end: datetime | None = None):
        match = {"user_id": user_id, "confidence": {"$ne": None}}
        if start and end:
            match["created_at"] = {"$gte": start, "$lt": end}
        pipeline = [
            {"$match": match},
            {"$group": {"_id": None, "avg": {"$avg": "$confidence"}}},
        ]
        res = await self.queries.aggregate(pipeline).to_list(1)
        return res[0]["avg"] if res else 0.0

    async def subject_distribution(self, user_id, limit: int = 10):
        pipeline = [
            {"$match": {"user_id": user_id, "subject_area": {"$ne": None}}},
            {"$group": {"_id": "$subject_area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return await self.queries.aggregate(pipeline).to_list(limit)

    async def confidence_daily(self, user_id, start: datetime | None = None, end: datetime | None = None):
        match = {"user_id": user_id, "confidence": {"$ne": None}}
        if start and end:
            match["created_at"] = {"$gte": start, "$lt": end}
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "avg": {"$avg": "$confidence"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        return await self.queries.aggregate(pipeline).to_list(None)

    async def subjects_over_time(self, user_id, start: datetime | None = None, end: datetime | None = None, limit: int = 5):
        match = {"user_id": user_id, "subject_area": {"$ne": None}}
        if start and end:
            match["created_at"] = {"$gte": start, "$lt": end}
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "subject": "$subject_area",
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit * 30},
        ]
        return await self.queries.aggregate(pipeline).to_list(None)

    async def confidence_histogram(self, user_id, buckets: list[float]):
        boundaries = sorted(buckets)
        pipeline = [
            {"$match": {"user_id": user_id, "confidence": {"$ne": None}}},
            {
                "$bucket": {
                    "groupBy": "$confidence",
                    "boundaries": boundaries,
                    "default": "other",
                    "output": {"count": {"$sum": 1}},
                }
            },
        ]
        return await self.queries.aggregate(pipeline).to_list(None)

    async def api_usage_by_endpoint(self, user_id, start_date: str | None = None, end_date: str | None = None):
        match = {"user_id": user_id}
        if start_date and end_date:
            match["date"] = {"$gte": start_date, "$lte": end_date}
        pipeline = [
            {"$match": match},
            {"$group": {"_id": "$endpoint", "count": {"$sum": "$count"}}},
            {"$sort": {"count": -1}},
        ]
        return await self.api_usage.aggregate(pipeline).to_list(None)
