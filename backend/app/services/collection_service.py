from datetime import datetime
from app.core.time_utils import now_ist
from bson import ObjectId

from app.repositories.collection_repo import CollectionRepo
from app.repositories.collection_item_repo import CollectionItemRepo


def now_utc():
    return now_ist()


class CollectionService:
    def __init__(self, db=None):
        self.collections = CollectionRepo(db=db)
        self.items = CollectionItemRepo(db=db)

    async def list_collections(self, user_id: str):
        rows = await self.collections.list_for_user(ObjectId(user_id))
        return [self._serialize_collection(r) for r in rows]

    async def create_collection(self, user_id: str, name: str):
        # position = next index
        existing = await self.collections.list_for_user(ObjectId(user_id))
        position = len(existing)
        doc = {
            "user_id": ObjectId(user_id),
            "name": (name or "").strip(),
            "position": position,
            "created_at": now_utc(),
            "tags": [],
        }
        res = await self.collections.insert(doc)
        doc["_id"] = res.inserted_id
        return self._serialize_collection(doc)

    async def rename_collection(self, user_id: str, collection_id: str, name: str):
        if not ObjectId.is_valid(collection_id):
            raise ValueError("Invalid collection id")
        res = await self.collections.update_one(
            {"_id": ObjectId(collection_id), "user_id": ObjectId(user_id)},
            {"$set": {"name": (name or "").strip()}},
        )
        return res.modified_count == 1

    async def update_tags(self, user_id: str, collection_id: str, tags: list[str]):
        if not ObjectId.is_valid(collection_id):
            raise ValueError("Invalid collection id")
        clean = [t.strip() for t in tags if t and t.strip()]
        res = await self.collections.update_one(
            {"_id": ObjectId(collection_id), "user_id": ObjectId(user_id)},
            {"$set": {"tags": clean}},
        )
        return res.modified_count == 1

    async def delete_collection(self, user_id: str, collection_id: str):
        if not ObjectId.is_valid(collection_id):
            raise ValueError("Invalid collection id")
        await self.items.delete_many({"collection_id": ObjectId(collection_id)})
        res = await self.collections.delete_one(
            {"_id": ObjectId(collection_id), "user_id": ObjectId(user_id)}
        )
        return res.deleted_count == 1

    async def reorder_collections(self, user_id: str, ordered_ids: list[str]):
        if not ordered_ids:
            return False
        ids = []
        for cid in ordered_ids:
            if not ObjectId.is_valid(cid):
                raise ValueError("Invalid collection id")
            ids.append(ObjectId(cid))
        res = await self.collections.bulk_reorder(ObjectId(user_id), ids)
        return res is not None

    async def list_items(self, user_id: str, collection_id: str):
        if not ObjectId.is_valid(collection_id):
            raise ValueError("Invalid collection id")
        rows = await self.items.items_in_collection(ObjectId(collection_id))
        return [self._serialize_item(r) for r in rows]

    async def add_item(self, user_id: str, collection_id: str, paper_id: str):
        if not ObjectId.is_valid(collection_id) or not ObjectId.is_valid(paper_id):
            raise ValueError("Invalid id")
        doc = {
            "collection_id": ObjectId(collection_id),
            "paper_id": ObjectId(paper_id),
            "added_at": now_utc(),
        }
        res = await self.items.insert(doc)
        doc["_id"] = res.inserted_id
        return self._serialize_item(doc)

    async def remove_item(self, user_id: str, collection_id: str, paper_id: str):
        if not ObjectId.is_valid(collection_id) or not ObjectId.is_valid(paper_id):
            raise ValueError("Invalid id")
        res = await self.items.delete_one(
            {"collection_id": ObjectId(collection_id), "paper_id": ObjectId(paper_id)}
        )
        return res.deleted_count == 1

    def _serialize_collection(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["user_id"] = str(doc["user_id"])
        if "position" in doc:
            doc["position"] = int(doc["position"])
        if "tags" not in doc:
            doc["tags"] = []
        return doc

    def _serialize_item(self, doc: dict) -> dict:
        if not doc:
            return {}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        doc["collection_id"] = str(doc["collection_id"])
        doc["paper_id"] = str(doc["paper_id"])
        return doc
