from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest_asyncio

from app.routers import tasks

pytestmark = pytest.mark.no_db
class DummyTaskRepository:
    created_task = None
    task_list = []
    assign_called_with = None
    update_assignment_calls = []
    user_team_id = None
    override_status = None

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.created_task = None
        cls.task_list = []
        cls.assign_called_with = None
        cls.update_assignment_calls = []
        cls.user_team_id = None
        cls.override_status = None

    async def create_task(self, disaster_id, commander_id, payload):
        self.__class__.created_task = (disaster_id, commander_id, payload)
        return SimpleNamespace(
            task_id=uuid4(),
            disaster_id=disaster_id,
            task_type=payload.task_type,
            description=payload.description,
            priority=payload.priority,
            status="pending",
            created_at=datetime.utcnow(),
        )

    async def get_tasks(self, *args, **kwargs):
        return self.__class__.task_list

    async def assign_team(self, task_id, team_id, commander_id):
        if self.__class__.assign_called_with == (task_id, team_id):
            raise ValueError("duplicate")
        self.__class__.assign_called_with = (task_id, team_id)

    async def update_assignment_status(self, *args, **kwargs):
        self.__class__.update_assignment_calls.append(args)

    async def get_user_team_id(self, *_args, **_kwargs):
        return self.__class__.user_team_id

    async def update_task_status(self, task_id, status):
        self.__class__.override_status = (task_id, status)


@pytest.fixture(autouse=True)
def stub_repository(monkeypatch):
    DummyTaskRepository.reset()
    monkeypatch.setattr(tasks, "TaskRepository", DummyTaskRepository)
    yield DummyTaskRepository


def _build_app(user_role="commander", team_id=None):
    app = FastAPI()
    app.include_router(tasks.router)

    async def _db():
        yield object()

    user = SimpleNamespace(
        user_id=uuid4(),
        role=SimpleNamespace(name=user_role),
    )

    async def _current_user():
        return user

    app.dependency_overrides[tasks.get_db] = _db
    app.dependency_overrides[tasks.get_current_user] = _current_user
    return app


@pytest_asyncio.fixture
async def commander_client():
    app = _build_app("commander")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest_asyncio.fixture
async def responder_client():
    app = _build_app("responder")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_create_task_returns_response(commander_client, stub_repository):
    payload = {
        "task_type": "medic",
        "description": "Assist",
        "priority": "high",
        "latitude": 12.1,
        "longitude": 77.2,
    }
    response = await commander_client.post(f"/disasters/{uuid4()}/tasks", json=payload)
    assert response.status_code == 200
    assert response.json()["task_type"] == "medic"


@pytest.mark.asyncio
async def test_list_tasks_formats_assignments(commander_client, stub_repository):
    stub_repository.task_list = [
        SimpleNamespace(
            task_id=uuid4(),
            disaster_id=uuid4(),
            task_type="fire",
            description="Desc",
            priority="high",
            status="pending",
            location=None,
            created_at=datetime.utcnow(),
            assignments=[],
        )
    ]
    response = await commander_client.get(f"/disasters/{uuid4()}/tasks")
    assert response.status_code == 200
    assert response.json()[0]["description"] == "Desc"


@pytest.mark.asyncio
async def test_assign_team_handles_duplicates(commander_client, stub_repository):
    task_id = uuid4()
    team_id = uuid4()
    payload = {"team_id": str(team_id)}
    resp = await commander_client.post(f"/tasks/{task_id}/assignments", json=payload)
    assert resp.status_code == 200
    resp_dup = await commander_client.post(f"/tasks/{task_id}/assignments", json=payload)
    assert resp_dup.status_code == 400


@pytest.mark.asyncio
async def test_update_assignment_status_checks_team_membership(responder_client, stub_repository):
    DummyTaskRepository.user_team_id = uuid4()
    payload = {"status": "on_scene"}
    response = await responder_client.patch(
        f"/tasks/{uuid4()}/assignments/{uuid4()}/status", json=payload
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_assignment_status_allows_responder_with_matching_team(responder_client, stub_repository):
    team_id = uuid4()
    DummyTaskRepository.user_team_id = team_id
    payload = {"status": "on_scene"}
    response = await responder_client.patch(
        f"/tasks/{uuid4()}/assignments/{team_id}/status", json=payload
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_assignment_status_allows_commander(commander_client, stub_repository):
    payload = {"status": "completed"}
    response = await commander_client.patch(
        f"/tasks/{uuid4()}/assignments/{uuid4()}/status", json=payload
    )
    assert response.status_code == 200
    assert stub_repository.update_assignment_calls


@pytest.mark.asyncio
async def test_update_task_status_invokes_repository(commander_client, stub_repository):
    task_id = uuid4()
    response = await commander_client.patch(f"/tasks/{task_id}/status", json={"status": "cancelled"})
    assert response.status_code == 200
    assert stub_repository.override_status == (task_id, "cancelled")
@pytest.fixture(autouse=True)
def setup_database():
    yield
