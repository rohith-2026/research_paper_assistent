from app.repositories.base_repo import BaseRepo

class NoteRepo(BaseRepo):
    collection_name = "notes"

    async def list_for_paper(self, user_id, paper_id):
        return await self.col.find({
            "user_id": user_id,
            "paper_id": paper_id
        }).sort("created_at", -1).to_list(None)

    async def search_for_paper(self, user_id, paper_id, query: str):
        return await self.col.find({
            "user_id": user_id,
            "paper_id": paper_id,
            "content": {"$regex": query, "$options": "i"},
        }).sort("created_at", -1).to_list(None)
