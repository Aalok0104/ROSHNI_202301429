import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_LOCATIONS = [
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
]

# Load .env files (first base, then .env.local overrides)
for env_path in ENV_LOCATIONS:
    if env_path.exists():
        load_dotenv(env_path, override=False)

for env_path in [BASE_DIR / ".env.local", BASE_DIR.parent / ".env.local"]:
    if env_path.exists():
        load_dotenv(env_path, override=True)

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://roshni:roshni@localhost:5432/roshni",
)

# future=True enables SQLAlchemy 2.0 style behaviour
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, future=True)


def _ensure_postgres_extensions() -> None:
    """Install required extensions when running against PostgreSQL."""
    if engine.dialect.name != "postgresql":
        return

    try:
        with engine.begin() as connection:
            connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            connection.execute(text('CREATE EXTENSION IF NOT EXISTS "postgis"'))
    except SQLAlchemyError as exc:  # pragma: no cover - logged for visibility
        logger.warning("Unable to ensure PostgreSQL extensions: %s", exc)


_ensure_postgres_extensions()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

Base = declarative_base()
