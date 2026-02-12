from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.note_repo import NoteRepo


def now_utc():
    return now_ist()


class NotesService:
    def __init__(self, db=None):
        self.notes = NoteRepo(db=db)

    async def list_for_paper(self, user_id: str, paper_id: str, query: str | None = None):
        if not ObjectId.is_valid(paper_id):
            raise ValueError("Invalid paper id")
        if query:
            rows = await self.notes.search_for_paper(
                ObjectId(user_id), ObjectId(paper_id), query
            )
        else:
            rows = await self.notes.list_for_paper(ObjectId(user_id), ObjectId(paper_id))
        return [self._serialize(r) for r in rows]

    async def create(self, user_id: str, paper_id: str, content: str):
        if not ObjectId.is_valid(paper_id):
            raise ValueError("Invalid paper id")
        doc = {
            "user_id": ObjectId(user_id),
            "paper_id": ObjectId(paper_id),
            "content": (content or "").strip(),
            "created_at": now_utc(),
        }
        res = await self.notes.insert(doc)
        doc["_id"] = res.inserted_id
        return self._serialize(doc)

    async def update(self, user_id: str, note_id: str, content: str):
        if not ObjectId.is_valid(note_id):
            raise ValueError("Invalid note id")
        res = await self.notes.update_one(
            {"_id": ObjectId(note_id), "user_id": ObjectId(user_id)},
            {"$set": {"content": (content or "").strip()}},
        )
        return res.modified_count == 1

    async def delete(self, user_id: str, note_id: str):
        if not ObjectId.is_valid(note_id):
            raise ValueError("Invalid note id")
        res = await self.notes.delete_one(
            {"_id": ObjectId(note_id), "user_id": ObjectId(user_id)}
        )
        return res.deleted_count == 1

    def _serialize(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        doc["paper_id"] = str(doc["paper_id"])
        return doc
