from app.repositories.base_repo import BaseRepo


class AdminUserRepo(BaseRepo):
    collection_name = "admin_users"

    async def get_by_email(self, email: str):
        return await self.find_one({"email": email})

    async def get_by_id(self, admin_id):
        return await self.find_one({"_id": admin_id})
