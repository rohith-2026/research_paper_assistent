from app.repositories.base_repo import BaseRepo

class PaperRepo(BaseRepo):
    collection_name = "papers"

    async def by_user(self, user_id):
        return await self.col.find({"user_id": user_id}).to_list(None)

    async def list_by_user(self, user_id, limit=20, skip=0):
        cursor = (
            self.col.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def get_by_title_for_user(self, user_id, title: str):
        return await self.find_one(
            {
                "user_id": user_id,
                "title": title,
                "$or": [{"kind": "saved"}, {"kind": {"$exists": False}}],
            }
        )

    async def get_any_by_title_for_user(self, user_id, title: str):
        return await self.find_one({"user_id": user_id, "title": title})

    async def get_by_id_and_user(self, paper_id, user_id):
        return await self.find_one({"_id": paper_id, "user_id": user_id})

    async def get_by_paper_uid(self, paper_uid):
        return await self.find_one({"paper_uid": paper_uid})

    async def list_by_paper_uids(self, user_id, paper_uids: list):
        cursor = self.col.find(
            {"user_id": user_id, "paper_uid": {"$in": paper_uids}}
        )
        return await cursor.to_list(length=None)

    async def list_by_ids_for_user(self, paper_ids, user_id):
        cursor = (
            self.col.find({"_id": {"$in": paper_ids}, "user_id": user_id})
            .sort("created_at", -1)
        )
        return await cursor.to_list(length=None)

    async def list_saved_by_user(self, user_id, limit=20, skip=0):
        cursor = (
            self.col.find(
                {
                    "user_id": user_id,
                    "$or": [{"kind": "saved"}, {"kind": {"$exists": False}}],
                }
            )
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def list_by_query_id(self, user_id, query_id, limit=10):
        cursor = (
            self.col.find({"user_id": user_id, "query_id": query_id, "kind": "query_result"})
            .sort("rank", 1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def get_by_query_and_uid(self, user_id, query_id, paper_uid: str):
        return await self.find_one(
            {
                "user_id": user_id,
                "query_id": query_id,
                "paper_uid": paper_uid,
                "kind": "query_result",
            }
        )

    async def list_candidates(self, user_id, subject_area: str | None, limit: int = 100):
        query = {"user_id": user_id}
        if subject_area:
            query["subject_area"] = subject_area
        cursor = self.col.find(query).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
