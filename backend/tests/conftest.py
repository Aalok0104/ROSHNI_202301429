from __future__ import annotations

import os
from typing import Generator, Tuple

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models


@pytest.fixture(scope="session")
def engine():
    test_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    metadata = MetaData()
    for table in (
        models.Role.__table__,
        models.User.__table__,
        models.UserProfile.__table__,
        models.UserRole.__table__,
        models.EmergencyContact.__table__,
        models.UserFamilyLink.__table__,
    ):
        table.to_metadata(metadata)

    metadata.create_all(test_engine)
    yield test_engine
    metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()

    TestingSession = sessionmaker(bind=connection, autoflush=False, autocommit=False)
    session = TestingSession()

    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture
def test_client(db_session: Session, monkeypatch) -> Generator[Tuple[TestClient, Session], None, None]:
    os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
    os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
    os.environ.setdefault("FRONTEND_REDIRECT_URL", "http://frontend.test")

    from app import main as main_module

    def override_get_db():
        yield db_session

    monkeypatch.setattr(main_module, "google_client_id", os.environ["GOOGLE_CLIENT_ID"])
    monkeypatch.setattr(main_module, "google_client_secret", os.environ["GOOGLE_CLIENT_SECRET"])
    monkeypatch.setattr(main_module, "frontend_redirect_url", os.environ["FRONTEND_REDIRECT_URL"])

    main_module.app.dependency_overrides[main_module.get_db] = override_get_db
    client = TestClient(main_module.app)

    try:
        yield client, db_session
    finally:
        main_module.app.dependency_overrides.clear()
