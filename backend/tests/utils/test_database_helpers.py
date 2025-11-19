import asyncio
from types import SimpleNamespace

import pytest

from app import database


def test_non_postgres_url_preserves_driver():
    target_url = "sqlite:///tmp.db"
    assert database._coerce_async_url(target_url) == target_url


def test_postgres_url_upgraded_to_async():
    url = "postgresql://user:pass@localhost/db"
    expected = "postgresql+asyncpg://user:pass@localhost/db"
    assert database._coerce_async_url(url) == expected


def test_ensure_postgres_extensions_noop_for_other_dialects(monkeypatch):
    dummy_engine = SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))
    monkeypatch.setattr(database, "engine", dummy_engine)
    asyncio.run(database.ensure_postgres_extensions())


@pytest.mark.asyncio
async def test_get_db_yields_session(monkeypatch):
    class DummyContext:
        def __init__(self):
            self.closed = False

        async def __aenter__(self):
            return "session"

        async def __aexit__(self, exc_type, exc, tb):
            self.closed = True

    class DummyFactory:
        def __call__(self):
            return DummyContext()

    monkeypatch.setattr(database, "AsyncSessionLocal", DummyFactory())

    agen = database.get_db()
    session = await agen.__anext__()
    assert session == "session"
    with pytest.raises(StopAsyncIteration):
        await agen.__anext__()
