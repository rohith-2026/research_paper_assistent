from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.repositories.paper_repo import PaperRepo


class PaperService:
    def __init__(self, db=None):
        self.papers = PaperRepo(db=db)

    async def list_saved(self, user_id: str, limit: int, skip: int = 0):
        uid = ObjectId(str(user_id))
        return await self.papers.list_saved_by_user(uid, limit=limit, skip=skip)

    async def save_paper(self, user_id: str, payload: dict):
        uid = ObjectId(str(user_id))
        title = (payload.get("title") or "").strip()
        if not title:
            raise ValueError("Title required")

        now = now_ist()
        set_fields = {
            "kind": "saved",
            "subject_area": payload.get("subject_area"),
        }
        if payload.get("abstract") is not None:
            set_fields["abstract"] = payload.get("abstract")
        if payload.get("url") is not None:
            set_fields["url"] = payload.get("url")
        if payload.get("authors") is not None:
            set_fields["authors"] = payload.get("authors") or []
        if payload.get("year") is not None:
            set_fields["year"] = payload.get("year")
        if payload.get("venue") is not None:
            set_fields["venue"] = payload.get("venue")
        if payload.get("source") is not None:
            set_fields["source"] = payload.get("source")

        await self.papers.update_one(
            {"user_id": uid, "title": title},
            {
                "$set": set_fields,
                "$setOnInsert": {"created_at": now, "user_id": uid, "title": title},
            },
            upsert=True,
        )

        saved = await self.papers.get_any_by_title_for_user(uid, title)
        if not saved:
            raise RuntimeError("Save failed")
        return saved

    async def save_query_papers(
        self,
        user_id: str,
        query_id: str,
        query_created_at: datetime,
        subject_area: str | None,
        papers: list[dict],
    ):
        uid = ObjectId(str(user_id))
        qid = ObjectId(str(query_id))
        now = now_ist()
        docs = []
        for idx, p in enumerate(papers):
            title = (p.get("title") or "").strip()
            if not title:
                continue
            docs.append(
                {
                    "user_id": uid,
                    "query_id": qid,
                    "query_created_at": query_created_at,
                    "rank": idx + 1,
                    "title": title,
                    "abstract": p.get("abstract"),
                    "url": p.get("url"),
                    "authors": p.get("authors") or [],
                    "year": p.get("year"),
                    "venue": p.get("venue"),
                    "source": p.get("source"),
                    "subject_area": subject_area,
                    "paper_uid": p.get("paper_uid"),
                    "kind": "query_result",
                    "created_at": now,
                }
            )
        if docs:
            await self.papers.insert_many(docs)
        return docs

    async def list_by_query(self, user_id: str, query_id: str, limit: int = 10):
        uid = ObjectId(str(user_id))
        qid = ObjectId(str(query_id))
        return await self.papers.list_by_query_id(uid, qid, limit=limit)
