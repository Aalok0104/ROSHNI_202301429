# tests/conftest.py
import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Ensure `backend/` is on sys.path so `app` package is importable when running tests
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base  # noqa: E402
from app.models import *  # noqa: F401,F403,E402  # ensure all models are imported


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    # point this to a dedicated TEST DB
    "postgresql://parshv:parshv@localhost:5432/roshni_test",
)

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
TestingSessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, future=True
)


def _ensure_postgres_extensions(engine) -> None:
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "postgis"'))


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """
    Create all tables once per test session on a clean test DB,
    then drop them after tests finish.
    """
    _ensure_postgres_extensions(engine)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(setup_database):
    """
    Provide a database session to each test.

    Each test runs in its own transaction-ish scope; we rollback at the
    end to keep the DB clean between tests.
    """
    session = TestingSessionLocal()
    try:
        yield session
        session.rollback()
        session.expunge_all()
    finally:
        session.close()
