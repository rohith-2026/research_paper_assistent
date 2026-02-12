from app.repositories.base_repo import BaseRepo

class CollectionRepo(BaseRepo):
    collection_name = "collections"

    async def list_for_user(self, user_id):
        cursor = (
            self.col.find({"user_id": user_id})
            .sort([("position", 1), ("created_at", -1)])
        )
        return await cursor.to_list(None)

    async def bulk_reorder(self, user_id, ordered_ids: list):
        if not ordered_ids:
            return None
        ops = []
        for idx, cid in enumerate(ordered_ids):
            ops.append(
                {
                    "updateOne": {
                        "filter": {"_id": cid, "user_id": user_id},
                        "update": {"$set": {"position": idx}},
                    }
                }
            )
        return await self.col.bulk_write(ops, ordered=False)
