# tests/conftest.py
import os
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime

import pytest
import pytest_asyncio
from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

# Ensure `backend/` is on sys.path so `app` package is importable when running tests
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.env import load_environment  # noqa: E402

load_environment()

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL must be set in environment (.env / .env.local at project root)"
    )

# Ensure application code uses the same database URL during tests
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.database import Base  # noqa: E402
from app.models import *  # noqa: F401,F403,E402  # ensure all models are imported
from app.models.user_family_models import Role, User, UserProfile  # noqa: E402
from app.models.disaster_management import Disaster  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
TestingSessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, future=True
)
ASYNC_TEST_DATABASE_URL = (
    TEST_DATABASE_URL
    if TEST_DATABASE_URL.startswith("postgresql+")
    else TEST_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
)
async_engine = create_async_engine(
    ASYNC_TEST_DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    poolclass=NullPool,
)
AsyncTestingSessionLocal = async_sessionmaker(
    bind=async_engine, expire_on_commit=False
)


def _ensure_postgres_extensions(engine) -> None:
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "postgis"'))


@pytest.fixture(scope="function", autouse=True)
def setup_database(request):
    if request.node.get_closest_marker("no_db"):
        yield
        return
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


@pytest_asyncio.fixture()
async def async_db_session(setup_database):
    session = AsyncTestingSessionLocal()
    try:
        yield session
        await session.rollback()
    finally:
        await session.close()


@pytest_asyncio.fixture
async def async_client():
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client


@pytest.fixture
def create_user(db_session):
    def _create_user(email="user@example.com", role_name="civilian"):
        role = db_session.query(Role).filter_by(name=role_name).one_or_none()
        if not role:
            default_ids = {"civilian": 1, "responder": 2, "commander": 3}
            role_id = default_ids.get(role_name, uuid4().int % (10**6))
            role = Role(role_id=role_id, name=role_name, description=role_name)
            db_session.add(role)
            db_session.commit()
        user = User(
            user_id=uuid4(),
            email=email,
            role_id=role.role_id,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        profile = UserProfile(user_id=user.user_id, full_name="Test User")
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user


@pytest_asyncio.fixture
async def async_create_user(async_db_session):
    async def _create_user(email="user@example.com", role_name="civilian"):
        result = await async_db_session.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if not role:
            default_ids = {"civilian": 1, "responder": 2, "commander": 3}
            role_id = default_ids.get(role_name, uuid4().int % (10**6))
            role = Role(role_id=role_id, name=role_name, description=role_name)
            async_db_session.add(role)
            await async_db_session.commit()
        user = User(
            user_id=uuid4(),
            email=email,
            role_id=role.role_id,
            is_active=True,
        )
        async_db_session.add(user)
        await async_db_session.commit()
        profile = UserProfile(user_id=user.user_id, full_name="Test User")
        async_db_session.add(profile)
        await async_db_session.commit()
        await async_db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture
def create_disaster(db_session):
    def _create_disaster():
        disaster = Disaster(
            disaster_id=uuid4(),
            title="Test Disaster",
            disaster_type="fire",
            severity_level="high",
            status="active",
            location=from_shape(Point(0, 0), srid=4326),
            reported_at=datetime.utcnow(),
        )
        db_session.add(disaster)
        db_session.commit()
        db_session.refresh(disaster)
        return disaster

    return _create_disaster


@pytest_asyncio.fixture
async def async_create_disaster(async_db_session):
    async def _create_disaster():
        disaster = Disaster(
            disaster_id=uuid4(),
            title="Test Disaster",
            disaster_type="fire",
            severity_level="high",
            status="active",
            location=from_shape(Point(0, 0), srid=4326),
            reported_at=datetime.utcnow(),
        )
        async_db_session.add(disaster)
        await async_db_session.commit()
        await async_db_session.refresh(disaster)
        return disaster

    return _create_disaster
