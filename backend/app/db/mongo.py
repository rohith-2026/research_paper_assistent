from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.time_utils import IST

client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True, tzinfo=IST)
db = client[settings.MONGO_DB]

users_col = db["users"]
refresh_tokens_col = db["refresh_tokens"]
password_resets_col = db["password_resets"]
queries_col = db["queries"]
papers_col = db["papers"] 

def get_db():
    return db
