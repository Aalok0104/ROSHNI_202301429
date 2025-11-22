import logging
import os

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .env import load_environment

logger = logging.getLogger(__name__)

load_environment()

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://roshni:roshni@localhost:5432/roshni",
)
SQLALCHEMY_DATABASE_URL = os.getenv("TEST_DATABASE_URL", SQLALCHEMY_DATABASE_URL)

def _coerce_async_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://")
    return url


ASYNC_SQLALCHEMY_DATABASE_URL = _coerce_async_url(SQLALCHEMY_DATABASE_URL)


engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)


async def ensure_postgres_extensions() -> None:
    """Install required extensions when running against PostgreSQL."""
    if engine.dialect.name != "postgresql":
        return

    try:
        async with engine.begin() as connection:
            await connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            await connection.execute(text('CREATE EXTENSION IF NOT EXISTS "postgis"'))
    except SQLAlchemyError as exc:  # pragma: no cover - logged for visibility
        logger.warning("Unable to ensure PostgreSQL extensions: %s", exc)


AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, autocommit=False, autoflush=False
)

Base = declarative_base()


# Dependency for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
