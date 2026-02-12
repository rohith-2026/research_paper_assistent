import os
import pytest
import asyncio

from app.db.mongo import get_db


def test_db_ping_if_configured():
    if not os.getenv("MONGO_URI") or not os.getenv("MONGO_DB"):
        pytest.skip("MONGO_URI/MONGO_DB not set")
    async def _ping():
        db = get_db()
        return await db.command("ping")
    result = asyncio.run(_ping())
    assert result.get("ok") == 1
