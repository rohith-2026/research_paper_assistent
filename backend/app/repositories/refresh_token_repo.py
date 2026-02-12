from app.repositories.base_repo import BaseRepo

class RefreshTokenRepo(BaseRepo):
    collection_name = "refresh_tokens"

    async def get_by_hash(self, token_hash: str):
        return await self.find_one({"token_hash": token_hash})

    async def revoke(self, token_hash: str):
        return await self.update_one(
            {"token_hash": token_hash},
            {"$set": {"revoked": True}}
        )

    async def delete_by_hash(self, token_hash: str):
        return await self.delete_one({"token_hash": token_hash})

    async def delete_by_user(self, user_id):
        return await self.delete_many({"user_id": user_id})
