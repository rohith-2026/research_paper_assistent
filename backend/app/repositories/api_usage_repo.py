from app.repositories.base_repo import BaseRepo

class ApiUsageRepo(BaseRepo):
    collection_name = "api_usage"

    async def usage_for_day(self, user_id, date):
        return await self.find_one({
            "user_id": user_id,
            "date": date
        })
