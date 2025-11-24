from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

from app.models.disaster_management import Disaster, DisasterTask, DisasterTaskAssignment
from app.models.responder_management import Team, ResponderProfile
from app.models.user_family_models import Role, User, UserProfile
from app.models.questionnaires_and_logs import DisasterLog
from app.repositories.task_repository import TaskRepository
from app.schemas.tasks import TaskCreateRequest


class AsyncSessionAdapter:
    def __init__(self, session):
        self._session = session

    def add(self, instance):
        self._session.add(instance)

    def add_all(self, instances):
        self._session.add_all(instances)

    async def execute(self, statement):
        return self._session.execute(statement)

    async def get(self, model, pk):
        return self._session.get(model, pk)

    async def commit(self):
        self._session.commit()

    async def refresh(self, instance):
        self._session.refresh(instance)


def _make_point(x=77.2, y=12.1):
    return from_shape(Point(x, y), srid=4326)


def _seed_commander(db_session):
    role = Role(role_id=930, name="commander")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id, email="commander@example.com")
    db_session.add(user)
    db_session.commit()
    return user


def _seed_disaster(db_session):
    commander = _seed_commander(db_session)
    disaster = Disaster(
        title="TaskDisaster",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="high",
        location=_make_point(),
        reported_by_user_id=commander.user_id,
    )
    db_session.add(disaster)
    db_session.commit()
    return disaster, commander


def _seed_team(db_session, commander=None):
    if not commander:
        commander = _seed_commander(db_session)
    team = Team(name="Team", team_type="medic", commander_user_id=commander.user_id, status="available")
    db_session.add(team)
    db_session.commit()
    return team


@pytest.mark.asyncio
async def test_create_task_persists_geometry(db_session):
    disaster, commander = _seed_disaster(db_session)
    repo = TaskRepository(AsyncSessionAdapter(db_session))
    payload = TaskCreateRequest(
        task_type="medic",
        description="Assist survivors",
        priority="high",
        latitude=12.1,
        longitude=77.2,
    )
    new_task = await repo.create_task(disaster.disaster_id, commander.user_id, payload)

    db_task = db_session.get(DisasterTask, new_task.task_id)
    assert db_task is not None
    assert db_task.task_type == "medic"
    stored = to_shape(db_task.location)
    assert stored.x == pytest.approx(77.2)
    assert stored.y == pytest.approx(12.1)
    log = db_session.query(DisasterLog).filter_by(disaster_id=disaster.disaster_id).first()
    assert log and "Task" in log.title


@pytest.mark.asyncio
async def test_get_tasks_returns_assignments(db_session):
    disaster, commander = _seed_disaster(db_session)
    team = _seed_team(db_session, commander)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="logistics",
        description="Deliver supplies",
        priority="medium",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()
    assignment = DisasterTaskAssignment(task_id=task.task_id, team_id=team.team_id, status="assigned")
    db_session.add(assignment)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    tasks = await repo.get_tasks(disaster.disaster_id, {"status": "pending"})
    assert len(tasks) == 1
    assert tasks[0].assignments[0].team_id == team.team_id


@pytest.mark.asyncio
async def test_get_tasks_filters_by_priority(db_session):
    disaster, commander = _seed_disaster(db_session)
    repo = TaskRepository(AsyncSessionAdapter(db_session))
    high = TaskCreateRequest(task_type="medic", description="High", priority="high", latitude=0.0, longitude=0.0)
    low = TaskCreateRequest(task_type="medic", description="Low", priority="low", latitude=0.0, longitude=0.0)
    await repo.create_task(disaster.disaster_id, commander.user_id, high)
    await repo.create_task(disaster.disaster_id, commander.user_id, low)

    tasks = await repo.get_tasks(disaster.disaster_id, {"priority": "high"})
    assert len(tasks) == 1
    assert tasks[0].description == "High"


@pytest.mark.asyncio
async def test_get_tasks_filters_by_status(db_session):
    disaster, commander = _seed_disaster(db_session)
    pending_task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="logistics",
        description="Pending task",
        priority="low",
        status="pending",
        location=_make_point(),
    )
    progress_task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="search",
        description="En route task",
        priority="medium",
        status="in_progress",
        location=_make_point(),
    )
    db_session.add_all([pending_task, progress_task])
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    tasks = await repo.get_tasks(disaster.disaster_id, {"status": "pending"})
    assert len(tasks) == 1
    assert tasks[0].description == "Pending task"


@pytest.mark.asyncio
async def test_assign_team_updates_statuses(db_session):
    disaster, commander = _seed_disaster(db_session)
    team = _seed_team(db_session, commander)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="search_rescue",
        description="Search zone",
        priority="high",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    await repo.assign_team(task.task_id, team.team_id, commander.user_id)

    db_session.refresh(task)
    db_session.refresh(team)
    assert task.status == "in_progress"
    assert team.status == "deployed"

    with pytest.raises(ValueError):
        await repo.assign_team(task.task_id, team.team_id, commander.user_id)


@pytest.mark.asyncio
async def test_update_assignment_status_manages_team_and_task_completion(db_session):
    disaster, commander = _seed_disaster(db_session)
    team1 = _seed_team(db_session, commander)
    team2 = _seed_team(db_session, commander)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="evacuation",
        description="Evacuate area",
        priority="high",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    await repo.assign_team(task.task_id, team1.team_id, commander.user_id)
    await repo.assign_team(task.task_id, team2.team_id, commander.user_id)

    await repo.update_assignment_status(task.task_id, team1.team_id, "on_scene")
    assignment = (
        db_session.query(DisasterTaskAssignment)
        .filter_by(task_id=task.task_id, team_id=team1.team_id)
        .one()
    )
    assert assignment.arrived_at is not None

    await repo.update_assignment_status(task.task_id, team1.team_id, "completed")
    db_session.refresh(team1)
    assert team1.status == "available"

    await repo.update_assignment_status(
        task.task_id,
        team2.team_id,
        "completed",
        eta=datetime.utcnow() + timedelta(hours=1),
    )
    db_session.refresh(task)
    assert task.status == "completed"
    assignment2 = (
        db_session.query(DisasterTaskAssignment)
        .filter_by(task_id=task.task_id, team_id=team2.team_id)
        .one()
    )
    assert isinstance(assignment2.eta, datetime)
    assert db_session.query(DisasterLog).filter_by(disaster_id=disaster.disaster_id).count() >= 1


@pytest.mark.asyncio
async def test_get_user_team_id_returns_identifier(db_session):
    commander = _seed_commander(db_session)
    team = _seed_team(db_session, commander)
    responder = User(role_id=commander.role_id, email="responder@team")
    db_session.add(responder)
    db_session.commit()
    db_session.add(UserProfile(user_id=responder.user_id, full_name="Responder"))
    db_session.add(
        ResponderProfile(
            user_id=responder.user_id,
            team_id=team.team_id,
            responder_type="medic",
            badge_number="T-1",
        )
    )
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    team_id = await repo.get_user_team_id(responder.user_id)
    assert team_id == team.team_id


@pytest.mark.asyncio
async def test_update_task_status_executes_override(db_session):
    disaster, commander = _seed_disaster(db_session)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="supply",
        description="Deliver kits",
        priority="medium",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    await repo.update_task_status(task.task_id, "cancelled")
    db_session.refresh(task)

    assert task.status == "cancelled"


@pytest.mark.asyncio
async def test_delete_task_removes_and_logs(db_session):
    disaster, commander = _seed_disaster(db_session)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="cleanup",
        description="Clean area",
        priority="low",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    task_id = task.task_id
    assert await repo.delete_task(task_id) is True
    db_session.expire_all()
    assert db_session.get(DisasterTask, task_id) is None
    log = db_session.query(DisasterLog).filter_by(disaster_id=disaster.disaster_id).order_by(DisasterLog.created_at.desc()).first()
    assert log and "deleted" in log.text_body


@pytest.mark.asyncio
async def test_update_assignment_status_handles_cancelled_release(db_session):
    disaster, commander = _seed_disaster(db_session)
    team = _seed_team(db_session, commander)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="support",
        description="Support ops",
        priority="medium",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    await repo.assign_team(task.task_id, team.team_id, commander.user_id)
    await repo.update_assignment_status(task.task_id, team.team_id, "cancelled")

    assignment = (
        db_session.query(DisasterTaskAssignment)
        .filter_by(task_id=task.task_id, team_id=team.team_id)
        .one()
    )
    assert assignment.released_at is not None
    db_session.refresh(team)
    assert team.status == "available"


@pytest.mark.asyncio
async def test_get_tasks_filters_by_team(db_session):
    disaster, commander = _seed_disaster(db_session)
    team = _seed_team(db_session, commander)
    other_team = _seed_team(db_session, commander)
    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="rescue",
        description="Team specific",
        priority="high",
        status="pending",
        location=_make_point(),
    )
    db_session.add(task)
    db_session.commit()
    db_session.add(DisasterTaskAssignment(task_id=task.task_id, team_id=team.team_id, status="assigned"))
    db_session.add(DisasterTaskAssignment(task_id=task.task_id, team_id=other_team.team_id, status="assigned"))
    db_session.commit()

    repo = TaskRepository(AsyncSessionAdapter(db_session))
    tasks = await repo.get_tasks(disaster.disaster_id, {"team_id": team.team_id})
    assert len(tasks) == 1


@pytest.mark.asyncio
async def test_delete_task_returns_none_when_missing(db_session):
    repo = TaskRepository(AsyncSessionAdapter(db_session))
    assert await repo.delete_task(uuid4()) is None
