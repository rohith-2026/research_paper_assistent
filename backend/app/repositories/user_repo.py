from app.repositories.base_repo import BaseRepo

class UserRepo(BaseRepo):
    collection_name = "users"

    async def get_by_email(self, email: str):
        return await self.find_one({"email": email})

    async def get_by_id(self, user_id):
        return await self.find_one({"_id": user_id})
