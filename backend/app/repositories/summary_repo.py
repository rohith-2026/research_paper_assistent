from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId
from app.repositories.base_repo import BaseRepo


def now_utc():
    return now_ist()


class SummaryRepository(BaseRepo):
    collection_name = "paper_summaries"

    def __init__(self, db=None):
        super().__init__(db=db)

    async def get_summary(self, user_id: str, query_id: str, paper_uid: str, summary_type: str):
        return await self.col.find_one(
            {
                "user_id": ObjectId(user_id),
                "query_id": ObjectId(query_id),
                "paper_uid": paper_uid,
                "summary_type": summary_type,
            }
        )

    async def upsert_summary(
        self,
        user_id: str,
        query_id: str,
        paper_uid: str,
        summary_type: str,
        content: str,
    ):
        now = now_utc()
        filter_doc = {
            "user_id": ObjectId(user_id),
            "query_id": ObjectId(query_id),
            "paper_uid": paper_uid,
            "summary_type": summary_type,
        }
        update_doc = {
            "$set": {
                "content": content,
                "created_at": now,
                "query_id": ObjectId(query_id),
                "paper_uid": paper_uid,
            }
        }
        await self.col.update_one(filter_doc, update_doc, upsert=True)
        return await self.col.find_one(filter_doc)

    async def update_summary(self, summary_id: ObjectId, content: str):
        now = now_utc()
        await self.col.update_one(
            {"_id": summary_id},
            {"$set": {"content": content, "created_at": now}},
        )
        return await self.col.find_one({"_id": summary_id})

    async def list_summaries(self, user_id: str, query_id: str, paper_uid: str):
        cursor = self.col.find(
            {
                "user_id": ObjectId(user_id),
                "query_id": ObjectId(query_id),
                "paper_uid": paper_uid,
            }
        ).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def list_for_query(self, user_id: str, query_id: str):
        cursor = self.col.find(
            {"user_id": ObjectId(user_id), "query_id": ObjectId(query_id)}
        ).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def list_for_refs(self, user_id: str, refs: list[dict], summary_type: str):
        if not refs:
            return []
        or_filters = []
        for r in refs:
            qid = r.get("query_id")
            paper_uid = r.get("paper_uid")
            if not qid or not paper_uid:
                continue
            if not ObjectId.is_valid(str(qid)):
                continue
            or_filters.append(
                {"query_id": ObjectId(str(qid)), "paper_uid": paper_uid}
            )
        if not or_filters:
            return []
        cursor = self.col.find(
            {
                "user_id": ObjectId(user_id),
                "summary_type": summary_type,
                "$or": or_filters,
            }
        ).sort("created_at", -1)
        return await cursor.to_list(length=None)
