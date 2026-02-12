import argparse
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password, now_utc


async def main():
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--role", default="admin")
    args = parser.parse_args()

    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    admins = db["admin_users"]

    email = args.email.strip().lower()
    existing = await admins.find_one({"email": email})
    if existing:
        print("Admin already exists:", email)
        return

    doc = {
        "email": email,
        "password_hash": hash_password(args.password),
        "role": args.role,
        "is_active": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "last_login_at": None,
    }
    await admins.insert_one(doc)
    print("Admin created:", email)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
