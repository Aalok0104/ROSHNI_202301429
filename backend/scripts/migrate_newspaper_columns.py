"""Idempotent migration for adding `base_url` and `is_national` columns to `newspapers`.

Usage (from backend directory):
    python -m scripts.migrate_newspaper_columns

This does NOT drop the table. It only adds columns if missing.
Run this before `python -m scripts.seed_news_data` after updating models.
"""
import asyncio
from typing import Set
from sqlalchemy import text
from app.database import engine

CHECK_SQL = """
SELECT column_name
FROM information_schema.columns
WHERE table_name='newspapers' AND column_name IN ('base_url','is_national');
"""

ALTERS = [
    "ALTER TABLE newspapers ADD COLUMN base_url TEXT;",
    "ALTER TABLE newspapers ADD COLUMN is_national BOOLEAN NOT NULL DEFAULT FALSE;",
]

async def migrate():
    async with engine.begin() as conn:
        result = await conn.execute(text(CHECK_SQL))
        existing: Set[str] = {row[0] for row in result.fetchall()}
        to_apply = []
        for stmt in ALTERS:
            if "base_url" in stmt and "base_url" in existing:
                continue
            if "is_national" in stmt and "is_national" in existing:
                continue
            to_apply.append(stmt)
        if not to_apply:
            print("✅ Columns already present. Nothing to do.")
            return
        for stmt in to_apply:
            print(f"🔧 Applying: {stmt}")
            await conn.execute(text(stmt))
        print("✅ Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
