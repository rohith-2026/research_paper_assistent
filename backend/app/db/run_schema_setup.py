"""
One-off runner to apply MongoDB schema validators and indexes.
Usage:
  python -m app.db.run_schema_setup
"""

import asyncio

from app.db.schema_and_indexes import ensure_schema_and_indexes


async def _run() -> None:
    await ensure_schema_and_indexes()


if __name__ == "__main__":
    asyncio.run(_run())
