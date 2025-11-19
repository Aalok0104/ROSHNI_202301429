from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import pytest_asyncio

from app.routers import disasters

pytestmark = pytest.mark.no_db


@pytest.fixture(autouse=True)
def setup_database():
    yield


def _make_disaster(title="D-1"):
    return SimpleNamespace(
        disaster_id=uuid4(),
        title=title,
        description="desc",
        disaster_type="fire",
        status="active",
        severity_level="high",
        location=from_shape(Point(77, 12), srid=4326),
    )


class DummyDisasterRepository:
    convert_result = None
    disaster_list = []
    stats_result = {"total_deaths": 1, "total_injured": 2, "resources_cost_estimate": 0.0, "affected_population_count": 0, "personnel_deployed": 0}
    map_result = {"disaster_location": None, "affected_area": None, "critical_infrastructure": [], "active_teams": []}
    closed_id = None

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.convert_result = None
        cls.disaster_list = []
        cls.map_result = {"disaster_location": None, "affected_area": None, "critical_infrastructure": [], "active_teams": []}
        cls.closed_id = None

    async def convert_incident(self, *_args, **_kwargs):
        return self.__class__.convert_result

    async def get_disasters(self, *_args, **_kwargs):
        return self.__class__.disaster_list

    async def get_stats(self, *_args, **_kwargs):
        return self.__class__.stats_result

    async def get_map_data(self, *_args, **_kwargs):
        return self.__class__.map_result

    async def close_disaster(self, disaster_id):
        self.__class__.closed_id = disaster_id


@pytest.fixture(autouse=True)
def stub_repository(monkeypatch):
    DummyDisasterRepository.reset()
    monkeypatch.setattr(disasters, "DisasterRepository", DummyDisasterRepository)
    yield DummyDisasterRepository


@pytest.fixture
def disasters_app():
    app = FastAPI()
    app.include_router(disasters.router)

    async def _db():
        yield object()

    user = SimpleNamespace(
        user_id=uuid4(),
        role=SimpleNamespace(name="commander"),
    )

    async def _current_user():
        return user

    app.dependency_overrides[disasters.get_db] = _db
    app.dependency_overrides[disasters.get_current_user] = _current_user
    return app


@pytest_asyncio.fixture
async def client(disasters_app):
    transport = ASGITransport(app=disasters_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_convert_endpoint_returns_error_when_missing(client, stub_repository):
    stub_repository.convert_result = None
    response = await client.post(
        f"/disasters/incidents/{uuid4()}/convert",
        json={"severity_level": "high", "radius_meters": 1000},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_convert_endpoint_formats_response(client, stub_repository):
    stub_repository.convert_result = _make_disaster("Converted")
    response = await client.post(
        f"/disasters/incidents/{uuid4()}/convert",
        json={"severity_level": "high", "radius_meters": 500},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Converted"


@pytest.mark.asyncio
async def test_convert_endpoint_handles_missing_geometry(client, stub_repository):
    disaster = _make_disaster("NoGeo")
    disaster.location = None
    stub_repository.convert_result = disaster

    response = await client.post(
        f"/disasters/incidents/{uuid4()}/convert",
        json={"severity_level": "medium", "radius_meters": 500},
    )
    assert response.status_code == 200
    assert response.json()["latitude"] == 0.0


@pytest.mark.asyncio
async def test_list_disasters_returns_payload(client, stub_repository):
    stub_repository.disaster_list = [_make_disaster("One")]
    response = await client.get("/disasters")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "One"


@pytest.mark.asyncio
async def test_stats_endpoint_proxies_repository(client):
    response = await client.get(f"/disasters/{uuid4()}/stats")
    assert response.status_code == 200
    assert response.json()["total_deaths"] == 1


@pytest.mark.asyncio
async def test_map_endpoint_returns_404_when_missing(client, stub_repository):
    stub_repository.map_result = None
    response = await client.get(f"/disasters/{uuid4()}/map")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_map_endpoint_returns_payload(client, stub_repository):
    stub_repository.map_result = {
        "disaster_location": {"properties": {}, "geometry": {"type": "Point", "coordinates": [0, 0]}},
        "affected_area": None,
        "critical_infrastructure": [],
        "active_teams": [],
    }
    response = await client.get(f"/disasters/{uuid4()}/map")
    assert response.status_code == 200
    assert response.json()["disaster_location"] is not None


@pytest.mark.asyncio
async def test_close_disaster_calls_repository(client, stub_repository):
    disaster_id = uuid4()
    response = await client.patch(f"/disasters/{disaster_id}/close")
    assert response.status_code == 200
    assert stub_repository.closed_id == disaster_id
