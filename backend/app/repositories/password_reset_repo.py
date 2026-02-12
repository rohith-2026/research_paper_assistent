from app.repositories.base_repo import BaseRepo


class PasswordResetRepo(BaseRepo):
    collection_name = "password_resets"

    async def get_by_token_hash(self, token_hash: str):
        return await self.find_one({"token_hash": token_hash})

    async def get_by_reset_hash_unused(self, reset_hash: str):
        return await self.find_one({"reset_token_hash": reset_hash, "used": False})
