import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from types import SimpleNamespace

from app.routers import disaster_news


@pytest.mark.asyncio
async def test_analyze_disaster_news_success(monkeypatch):
    app = FastAPI()
    app.include_router(disaster_news.router)

    async def _db():
        yield object()

    async def fake_prioritized(db, state_id, city_name):
        return [{"name": "Local", "rss_url": "http://example.com/rss", "city": "City", "state": "State"}]

    async def fake_fetch(newspapers, keyword=None):
        return [
            {
                "title": "Flood alert",
                "description": "desc",
                "link": "http://example.com/1",
                "published": "today",
                "disaster_keyword": "flood",
                "priority_score": 10,
                "newspaper_name": "Local News",
            }
        ]

    app.dependency_overrides[disaster_news.get_db] = _db
    monkeypatch.setattr(disaster_news, "build_prioritized_newspaper_dicts", fake_prioritized)
    monkeypatch.setattr(disaster_news, "fetch_all_news", fake_fetch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/api/disaster-news/analyze", json={"state_id": 1, "city": "Chennai"})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["total_articles"] == 1
        assert payload["unavailable_count"] == 1


@pytest.mark.asyncio
async def test_analyze_disaster_news_no_newspapers(monkeypatch):
    app = FastAPI()
    app.include_router(disaster_news.router)

    async def _db():
        yield object()

    async def fake_prioritized(db, state_id, city_name):
        return []

    app.dependency_overrides[disaster_news.get_db] = _db
    monkeypatch.setattr(disaster_news, "build_prioritized_newspaper_dicts", fake_prioritized)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/api/disaster-news/analyze", json={"state_id": 1, "city": "Nowhere"})
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_analyze_disaster_news_scraper_failure(monkeypatch):
    app = FastAPI()
    app.include_router(disaster_news.router)

    async def _db():
        yield object()

    async def fake_prioritized(db, state_id, city_name):
        return [{"name": "Local", "rss_url": "http://example.com/rss"}]

    async def fake_fetch(newspapers, keyword=None):
        raise RuntimeError("boom")

    app.dependency_overrides[disaster_news.get_db] = _db
    monkeypatch.setattr(disaster_news, "build_prioritized_newspaper_dicts", fake_prioritized)
    monkeypatch.setattr(disaster_news, "fetch_all_news", fake_fetch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/api/disaster-news/analyze", json={"state_id": 1, "city": "City"})
        assert resp.status_code == 500


@pytest.mark.asyncio
async def test_analyze_disaster_news_handles_empty_articles(monkeypatch):
    app = FastAPI()
    app.include_router(disaster_news.router)

    async def _db():
        yield object()

    async def fake_prioritized(db, state_id, city_name):
        return [{"name": "Local", "rss_url": "http://example.com/rss"}]

    async def fake_fetch(newspapers, keyword=None):
        return []

    app.dependency_overrides[disaster_news.get_db] = _db
    monkeypatch.setattr(disaster_news, "build_prioritized_newspaper_dicts", fake_prioritized)
    monkeypatch.setattr(disaster_news, "fetch_all_news", fake_fetch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/api/disaster-news/analyze", json={"state_id": 1, "city": "City"})
        assert resp.status_code == 200
        assert resp.json()["total_articles"] == 0


@pytest.mark.asyncio
async def test_analyze_disaster_news_unexpected_error(monkeypatch):
    app = FastAPI()
    app.include_router(disaster_news.router)

    async def _db():
        yield object()

    async def fake_prioritized(db, state_id, city_name):
        return [{"name": "Local", "rss_url": "http://example.com/rss"}]

    async def fake_fetch(newspapers, keyword=None):
        return [{"link": "missing_title"}]  # will raise KeyError

    app.dependency_overrides[disaster_news.get_db] = _db
    monkeypatch.setattr(disaster_news, "build_prioritized_newspaper_dicts", fake_prioritized)
    monkeypatch.setattr(disaster_news, "fetch_all_news", fake_fetch)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/api/disaster-news/analyze", json={"state_id": 1, "city": "City"})
        assert resp.status_code == 500


@pytest.mark.asyncio
async def test_disaster_news_lookup_endpoints():
    class StubResult:
        def __init__(self, rows):
            self._rows = rows
        def scalars(self):
            return self
        def all(self):
            return self._rows

    class StubDB:
        def __init__(self, rows):
            self.rows = rows
        async def execute(self, _stmt):
            return StubResult(self.rows)

    commander = SimpleNamespace(user_id="cmd", role=SimpleNamespace(name="commander"))

    states = await disaster_news.get_news_states(db=StubDB([SimpleNamespace(id=1, name="State")]), current_user=commander)
    assert states[0].name == "State"

    cities = await disaster_news.get_news_cities(state_id=1, db=StubDB([SimpleNamespace(id=2, name="City")]), current_user=commander)
    assert cities[0].name == "City"

    log = SimpleNamespace(
        id=3,
        city_name="City",
        state_name="State",
        keyword=None,
        timestamp=SimpleNamespace(isoformat=lambda: "2024-01-01T00:00:00Z"),
        total_articles=1,
        fake_count=0,
        real_count=1,
    )
    history = await disaster_news.get_analysis_history(db=StubDB([log]), current_user=commander)
    assert history[0].city == "City"
