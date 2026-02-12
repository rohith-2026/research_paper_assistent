from app.repositories.base_repo import BaseRepo

class AdminSessionRepo(BaseRepo):
    collection_name = "sessions_admin"

    async def by_user(self, user_id):
        return await self.col.find({"user_id": user_id}).to_list(None)

    async def touch_session(self, user_id, session_id, last_activity_at):
        return await self.col.update_one(
            {"user_id": user_id, "session_id": session_id},
            {"$set": {"last_activity_at": last_activity_at}},
            upsert=True,
        )
