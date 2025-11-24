import pytest


def test_main_app_initializes():
    from app.main import app

    assert app.title == "ROSHNI API Backend"


@pytest.mark.asyncio
async def test_main_lifespan_and_root_endpoint(monkeypatch):
    import app.main as app_main
    app = app_main.app
    from httpx import ASGITransport, AsyncClient

    class DummyConn:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def run_sync(self, fn):
            return None

    class DummyEngine:
        def begin(self):
            return DummyConn()

    class DummyResult:
        def scalars(self):
            return self

        def all(self):
            return []

    class DummySession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def execute(self, stmt):
            return DummyResult()

        def add_all(self, data):
            self.added = data

        async def commit(self):
            return None

    monkeypatch.setattr(app_main, "engine", DummyEngine())
    monkeypatch.setattr(app_main, "AsyncSessionLocal", lambda: DummySession())

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            resp = await client.get("/")
            assert resp.status_code == 200
            assert resp.json()["message"] == "ROSHNI API Documentation"
