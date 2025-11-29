import asyncio
from types import SimpleNamespace
from uuid import uuid4
from datetime import datetime

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import pytest_asyncio

from app.routers import incidents

pytestmark = pytest.mark.no_db


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    yield


def _make_incident(title="Incident One"):
    location = from_shape(Point(77, 12), srid=4326)
    media = [
        SimpleNamespace(
            media_id=uuid4(),
            file_type="image",
            storage_path="/tmp/file.png",
        )
    ]
    return SimpleNamespace(
        incident_id=uuid4(),
        reported_by_user_id=uuid4(),
        title=title,
        description="Details",
        incident_type="fire",
        status="open",
        reported_at=datetime.utcnow(),
        location=location,
        media=media,
    )


class DummyIncidentRepository:
    duplicate_result = None
    created_incident = None
    add_media_payload = None
    discard_called_with = None
    convert_result = None
    incidents_list = []
    user_incidents = []
    deleted_incident = None
    updated_incident = None

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.duplicate_result = None
        cls.created_incident = None
        cls.add_media_payload = None
        cls.discard_called_with = None
        cls.convert_result = None
        cls.incidents_list = []
        cls.user_incidents = []
        cls.deleted_incident = None
        cls.updated_incident = None

    async def find_duplicate_incident(self, *args, **kwargs):
        return self.__class__.duplicate_result

    async def create_incident(self, user_id, data, is_sos=False):
        self.__class__.created_incident = (user_id, data, is_sos)
        return _make_incident("Created")

    async def add_media(self, incident_id, user_id, file_meta):
        self.__class__.add_media_payload = (incident_id, user_id, file_meta)
        return SimpleNamespace(media_id=uuid4())

    async def get_all_open_incidents(self):
        return self.__class__.incidents_list
    async def get_incidents_for_user(self, *_args, **_kwargs):
        return self.__class__.user_incidents

    async def discard_incident(self, incident_id):
        self.__class__.discard_called_with = incident_id
        return True

    async def convert_to_disaster(self, *args, **kwargs):
        return self.__class__.convert_result

    async def get_incident(self, incident_id):
        if self.__class__.incidents_list:
            return self.__class__.incidents_list[0]
        if self.__class__.user_incidents:
            return self.__class__.user_incidents[0]
        return None

    async def delete_incident(self, incident_id):
        if self.__class__.deleted_incident == "missing":
            return None
        self.__class__.deleted_incident = incident_id
        return True

    async def update_incident(self, incident_id, data):
        self.__class__.updated_incident = (incident_id, data)
        if self.__class__.incidents_list:
            return self.__class__.incidents_list[0]
        return None


@pytest.fixture(autouse=True)
def stub_repository(monkeypatch):
    DummyIncidentRepository.reset()
    monkeypatch.setattr(incidents, "IncidentRepository", DummyIncidentRepository)
    yield DummyIncidentRepository


@pytest.fixture
def incidents_app(monkeypatch):
    app = FastAPI()
    app.include_router(incidents.router)

    async def _db():
        yield object()

    commander = SimpleNamespace(
        user_id=uuid4(),
        role=SimpleNamespace(name="commander"),
    )

    async def _current_user():
        return commander

    app.dependency_overrides[incidents.get_db] = _db
    app.dependency_overrides[incidents.get_current_user] = _current_user
    yield app
    app.dependency_overrides.clear()


@pytest.fixture
def civilian_app(monkeypatch):
    app = FastAPI()
    app.include_router(incidents.router)

    async def _db():
        yield object()

    user = SimpleNamespace(
        user_id=uuid4(),
        role=SimpleNamespace(name="civilian"),
    )
    app.state.stub_user = user

    async def _current_user():
        return user

    app.dependency_overrides[incidents.get_db] = _db
    app.dependency_overrides[incidents.get_current_user] = _current_user
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(incidents_app):
    transport = ASGITransport(app=incidents_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture
async def civilian_client(civilian_app):
    transport = ASGITransport(app=civilian_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_create_incident_returns_duplicate_when_found(client, stub_repository):
    duplicate = _make_incident("Existing")
    stub_repository.duplicate_result = duplicate

    payload = {"latitude": 12.0, "longitude": 77.0, "title": "New", "incident_type": "fire"}
    response = await client.post("/incidents", json=payload)

    assert response.status_code == 200
    assert response.json()["title"] == "Existing"
    assert stub_repository.created_incident is None


@pytest.mark.asyncio
async def test_create_incident_handles_missing_geometry(client, stub_repository):
    incident = _make_incident("NoGeo")
    incident.location = None
    stub_repository.duplicate_result = incident

    payload = {"latitude": 0.0, "longitude": 0.0}
    response = await client.post("/incidents", json=payload)

    assert response.status_code == 200
    assert response.json()["latitude"] == 0.0


@pytest.mark.asyncio
async def test_create_incident_invokes_repository_on_new_report(client, stub_repository):
    payload = {"latitude": 12.0, "longitude": 77.0, "title": None, "incident_type": None}
    response = await client.post("/incidents", json=payload)

    assert response.status_code == 200
    assert stub_repository.created_incident is not None


@pytest.mark.asyncio
async def test_upload_media_rejects_invalid_type(client):
    files = {"file": ("note.txt", b"hello", "text/plain")}
    response = await client.post(f"/incidents/{uuid4()}/media", files=files)
    assert response.status_code == 400


class _DummyWriter:
    def __init__(self):
        self.written = b""

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return False

    async def write(self, data):
        self.written += data


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mime", "expected_type"),
    [("image/jpeg", "image"), ("audio/wav", "audio"), ("video/mp4", "video")],
)
async def test_upload_media_invokes_repository(client, monkeypatch, stub_repository, mime, expected_type):
    writer = _DummyWriter()

    def fake_open(*_args, **_kwargs):
        return writer

    monkeypatch.setattr(incidents.aiofiles, "open", fake_open)

    stub_repository.add_media_payload = None

    files = {"file": ("file.bin", b"data", mime)}
    response = await client.post(f"/incidents/{uuid4()}/media", files=files)

    assert response.status_code == 200
    incident_id, user_id, meta = stub_repository.add_media_payload
    assert meta["file_type"] == expected_type
    assert writer.written == b"data"


@pytest.mark.asyncio
async def test_get_incidents_returns_formatted_payload(client, stub_repository):
    stub_repository.incidents_list = [_make_incident("List Item")]
    response = await client.get("/incidents")
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "List Item"


@pytest.mark.asyncio
async def test_update_status_discard_branch(client, stub_repository):
    incident_id = uuid4()
    response = await client.patch(
        f"/incidents/{incident_id}/status", json={"status": "discarded"}
    )
    assert response.status_code == 200
    assert stub_repository.discard_called_with == incident_id


@pytest.mark.asyncio
async def test_update_status_discard_not_found(client, stub_repository, monkeypatch):
    async def fake_discard(self, _incident_id):
        return None

    monkeypatch.setattr(stub_repository, "discard_incident", fake_discard)

    response = await client.patch(
        f"/incidents/{uuid4()}/status", json={"status": "discarded"}
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_status_converts_incident(client, stub_repository):
    stub_repository.convert_result = SimpleNamespace(disaster_id=uuid4())
    response = await client.patch(
        f"/incidents/{uuid4()}/status",
        json={"status": "converted", "severity_level": "high"},
    )
    assert response.status_code == 200
    assert "disaster_id" in response.json()


@pytest.mark.asyncio
async def test_update_status_convert_returns_404_when_missing(client, stub_repository):
    stub_repository.convert_result = None
    response = await client.patch(
        f"/incidents/{uuid4()}/status",
        json={"status": "converted", "severity_level": "high"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_status_no_action_branch(client):
    response = await client.patch(
        f"/incidents/{uuid4()}/status", json={"status": "open"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "No action taken"


def test_format_incident_response_handles_string_time():
    incident = _make_incident("StringTime")
    incident.reported_at = "2024-01-01T00:00:00Z"
    resp = incidents.format_incident_response(incident)
    assert resp.reported_at == "2024-01-01T00:00:00Z"


@pytest.mark.asyncio
async def test_create_incident_handles_repository_errors(client, stub_repository, monkeypatch):
    async def boom(self, *_args, **_kwargs):
        raise RuntimeError("fail")

    monkeypatch.setattr(stub_repository, "create_incident", boom)
    payload = {"latitude": 12.0, "longitude": 77.0}
    response = await client.post("/incidents", json=payload)
    assert response.status_code == 500


@pytest.mark.asyncio
async def test_get_my_incidents_returns_only_user_records(civilian_client, stub_repository):
    mine = _make_incident("Mine")
    stub_repository.user_incidents = [mine]
    response = await civilian_client.get("/incidents/mine")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "Mine"


@pytest.mark.asyncio
async def test_delete_incident_blocks_non_owner(civilian_client, stub_repository):
    incident = _make_incident("Not Mine")
    stub_repository.incidents_list = [incident]
    response = await civilian_client.delete(f"/incidents/{incident.incident_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_incident_allows_owner(civilian_client, civilian_app, stub_repository):
    owned = _make_incident("My Incident")
    owned.reported_by_user_id = civilian_app.state.stub_user.user_id
    stub_repository.user_incidents = [owned]
    response = await civilian_client.delete(f"/incidents/{owned.incident_id}")
    assert response.status_code == 200
    assert stub_repository.deleted_incident == owned.incident_id


@pytest.mark.asyncio
async def test_delete_incident_allows_commander(client, stub_repository):
    incident = _make_incident("Commander Delete")
    stub_repository.incidents_list = [incident]
    response = await client.delete(f"/incidents/{incident.incident_id}")
    assert response.status_code == 200
    assert stub_repository.deleted_incident == incident.incident_id


@pytest.mark.asyncio
async def test_update_incident_allows_commander(client, stub_repository):
    incident = _make_incident("To Update")
    stub_repository.incidents_list = [incident]
    resp = await client.patch(
        f"/incidents/{incident.incident_id}",
        json={"title": "Updated", "latitude": 0.0, "longitude": 0.0},
    )
    assert resp.status_code == 200
    assert stub_repository.updated_incident[0] == incident.incident_id


@pytest.mark.asyncio
async def test_update_incident_returns_404_when_missing(client, stub_repository, monkeypatch):
    async def fake_update(self, *_args, **_kwargs):
        return None
    monkeypatch.setattr(stub_repository, "update_incident", fake_update)
    resp = await client.patch(
        f"/incidents/{uuid4()}",
        json={"title": "Missing", "latitude": 0.0, "longitude": 0.0},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_incident_returns_404_when_missing(client, stub_repository):
    stub_repository.incidents_list = []
    resp = await client.delete(f"/incidents/{uuid4()}")
    assert resp.status_code == 404
@pytest.fixture(autouse=True)
def setup_database():
    """Router tests don't need the global database fixture."""
    yield
