from __future__ import annotations

import asyncio
import logging
import os
from typing import Set

from sqlalchemy import inspect
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError

from ..database import Base, engine  # re-export Base for convenience
from ..env import load_environment

# Import models so that Base.metadata.create_all() sees them
from .user_family_models import Role, User, UserProfile, UserMedicalProfile
from .responder_management import Team, ResponderProfile
from .disaster_management import (
    Incident,
    Disaster,
    DisasterTask,
    DisasterTaskAssignment,
)
from .questionnaires_and_logs import (
    DisasterFollower,
    QuestionTemplate,
    DisasterQuestionState,
    DisasterLog,
    DisasterMedia,
    DisasterChatMessage,
)
from .mapping_and_tracking import MapSite, UserLocationLog
from .draft_reports import DisasterReportDraft
from .news_models import NewsState, NewsCity, Newspaper, NewsAnalysisLog

logger = logging.getLogger(__name__)


def _configured_database_name() -> str | None:
    """Parse the configured DATABASE_URL for its database name."""
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    try:
        return make_url(url).database
    except Exception:  # pragma: no cover - defensive guard around bad URLs
        logger.warning("DATABASE_URL could not be parsed; skipping schema validation.")
        return None


async def _list_existing_tables() -> Set[str]:
    """List table names currently present in the configured database."""
    async with engine.connect() as conn:
        return set(
            await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        )


async def _reset_schema() -> None:
    """Drop and recreate all tables for a clean test schema."""
    from ..database import ensure_postgres_extensions  # imported lazily to avoid cycles

    async with engine.begin() as conn:
        await ensure_postgres_extensions()
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def _ensure_models_assigned() -> None:
    """
    Verify that our SQLAlchemy models are mapped to the roshni database.

    If tables are missing (i.e., models not yet assigned), wipe the database and rebuild
    the schema so tests always start from a known, clean state. This is intentionally
    limited to the roshni DB defined in .env to avoid clobbering unintended targets.
    """
    load_environment()
    target_db = os.getenv("POSTGRES_DB", "roshni")
    configured_db = _configured_database_name()

    if configured_db and configured_db != target_db:
        logger.info(
            "Skipping schema reset: configured database '%s' does not match target '%s'.",
            configured_db,
            target_db,
        )
        return

    expected_tables = set(Base.metadata.tables.keys())

    try:
        existing_tables = await _list_existing_tables()
    except SQLAlchemyError as exc:  # pragma: no cover - instrumentation only
        logger.warning("Unable to inspect database for existing tables: %s", exc)
        existing_tables = set()

    if expected_tables and expected_tables.issubset(existing_tables):
        logger.info("Models already bound to database '%s'; leaving schema untouched.", target_db)
    else:
        logger.info("Models not bound to database '%s'; resetting schema for testing.", target_db)
        await _reset_schema()

    # Populate throwaway fixtures used during local testing.
    try:
        from .test_init import seed_test_data
    except Exception as exc:  # pragma: no cover - import guard
        logger.error("Failed importing test data seeder: %s", exc)
    else:
        await seed_test_data()


def _kickoff_schema_check() -> None:
    """Run the schema assignment check at import time."""
    try:
        if os.getenv("SKIP_SCHEMA_CHECK"):
            return
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule the task to avoid RuntimeWarning about un-awaited coroutines.
            loop.create_task(_ensure_models_assigned())
        else:
            loop.run_until_complete(_ensure_models_assigned())
    except Exception as exc:  # pragma: no cover - diagnostic fallback
        logger.error("Schema assignment check failed: %s", exc)


_kickoff_schema_check()

__all__ = [
    "Base",
    "Role",
    "User",
    "UserProfile",
    "UserMedicalProfile",
    "Team",
    "ResponderProfile",
    "Incident",
    "Disaster",
    "DisasterTask",
    "DisasterTaskAssignment",
    "DisasterFollower",
    "QuestionTemplate",
    "DisasterQuestionState",
    "DisasterLog",
    "DisasterMedia",
    "DisasterChatMessage",
    "MapSite",
    "UserLocationLog",
    "DisasterReportDraft",
    "NewsState",
    "NewsCity",
    "Newspaper",
    "NewsAnalysisLog",
]
