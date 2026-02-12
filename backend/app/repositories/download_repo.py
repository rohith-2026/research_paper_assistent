from app.repositories.base_repo import BaseRepo

class DownloadRepo(BaseRepo):
    collection_name = "downloads"

    async def by_user(self, user_id):
        return await self.col.find({"user_id": user_id}).to_list(None)
