from datetime import datetime
from app.core.time_utils import now_ist
from app.repositories.base_repo import BaseRepo


def now_utc():
    return now_ist()

class ChatSessionRepo(BaseRepo):
    collection_name = "chat_sessions"

    async def create_session(self, user_id, title):
        doc = {
            "user_id": user_id,
            "title": title,
            "created_at": now_utc(),
            "last_used_at": now_utc(),
        }
        return await self.insert(doc)

    async def list_sessions(self, user_id, limit=50):
        return await self.list_for_user(user_id, limit=limit)

    async def latest_for_user(self, user_id):
        return await self.col.find({"user_id": user_id}) \
            .sort("last_used_at", -1).limit(1).to_list(1)

    async def list_for_user(self, user_id, limit=50):
        cursor = (
            self.col.find({"user_id": user_id})
            .sort("last_used_at", -1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def get_for_user(self, user_id, session_id):
        return await self.find_one({"_id": session_id, "user_id": user_id})

    async def update_status(self, user_id, session_id, status, updated_at):
        return await self.update_one(
            {"_id": session_id, "user_id": user_id},
            {"$set": {"status": status, "updated_at": updated_at}},
        )

    async def update_last_used(self, user_id, session_id, updated_at):
        return await self.update_one(
            {"_id": session_id, "user_id": user_id},
            {"$set": {"last_used_at": updated_at}},
        )

    async def update_title(self, user_id, session_id, title: str):
        return await self.update_one(
            {"_id": session_id, "user_id": user_id},
            {"$set": {"title": title, "updated_at": now_utc()}},
        )

    async def delete_session(self, user_id, session_id):
        return await self.delete_one({"_id": session_id, "user_id": user_id})


class ChatMessageRepo(BaseRepo):
    collection_name = "chat_messages"

    async def add_message(self, session_id, user_id, role, content, meta=None):
        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "meta": meta or {},
            "created_at": now_utc(),
        }
        return await self.insert(doc)

    async def get_messages(self, session_id, limit=50):
        cursor = (
            self.col.find({"session_id": session_id})
            .sort("created_at", 1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def recent_for_user_session(self, user_id, session_id, limit=20):
        cursor = (
            self.col.find({"user_id": user_id, "session_id": session_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        rows = await cursor.to_list(length=limit)
        return list(reversed(rows))

    async def messages_for_session(self, session_id):
        return await self.col.find(
            {"session_id": session_id}
        ).sort("created_at", 1).to_list(None)

    async def get_by_id_for_user(self, user_id, message_id):
        return await self.find_one({"_id": message_id, "user_id": user_id})

    async def messages_for_user_session(self, user_id, session_id, limit=200):
        cursor = (
            self.col.find({"user_id": user_id, "session_id": session_id})
            .sort("created_at", 1)
            .limit(limit)
        )
        return await cursor.to_list(length=limit)

    async def delete_for_user_session(self, user_id, session_id):
        return await self.delete_many({"user_id": user_id, "session_id": session_id})

    async def count_for_user_session(self, user_id, session_id):
        return await self.count({"user_id": user_id, "session_id": session_id})
