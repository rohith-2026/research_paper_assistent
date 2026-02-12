from app.repositories.base_repo import BaseRepo

class QueryRepo(BaseRepo):
    collection_name = "queries"

    async def list_by_user(self, user_id, limit=20, skip=0):
        cursor = (
            self.col.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def avg_confidence(self, user_id):
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$confidence"}}},
        ]
        res = await self.col.aggregate(pipeline).to_list(1)
        return res[0]["avg"] if res else 0.0

    async def subject_breakdown(self, user_id, limit=10):
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$subject_area", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        return await self.col.aggregate(pipeline).to_list(limit)

    async def latest_for_user(self, user_id):
        return await self.col.find({"user_id": user_id}) \
            .sort("created_at", -1).limit(1).to_list(1)

    async def latest_subject_for_user(self, user_id):
        rows = await self.latest_for_user(user_id)
        if not rows:
            return None
        return rows[0].get("subject_area")

    async def get_by_id(self, query_id, user_id):
        return await self.find_one({"_id": query_id, "user_id": user_id})
