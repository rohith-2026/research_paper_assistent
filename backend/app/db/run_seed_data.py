"""
One-off seed runner for initial admin data.
Usage:
  set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD, then:
  python -m app.db.run_seed_data
"""

import os
import asyncio

from app.db.mongo import get_db
from app.core.security import hash_password, now_utc


async def _seed_admin_user(db) -> str:
    email = (os.getenv("ADMIN_SEED_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_SEED_PASSWORD") or ""
    if not email or not password:
        return "skipped (missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD)"
    if len(password) < 8:
        return "skipped (ADMIN_SEED_PASSWORD must be at least 8 chars)"

    admin_users = db["admin_users"]
    existing = await admin_users.find_one({"email": email})
    if existing:
        return "skipped (admin already exists)"

    await admin_users.insert_one(
        {
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "is_active": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
            "last_login_at": None,
        }
    )
    return "created"


async def _seed_admin_settings(db) -> str:
    admin_settings = db["admin_settings"]
    existing = await admin_settings.find_one({})
    if existing:
        return "skipped (settings already exist)"
    await admin_settings.insert_one(
        {
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
    )
    return "created"


async def _run() -> None:
    db = get_db()
    admin_status = await _seed_admin_user(db)
    settings_status = await _seed_admin_settings(db)
    print(f"admin_user: {admin_status}")
    print(f"admin_settings: {settings_status}")


if __name__ == "__main__":
    asyncio.run(_run())
