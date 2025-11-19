# tests/test_disaster_management.py
import pytest
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point, Polygon

from app.models.user_family_models import Role, User
from app.models.disaster_management import (
    Incident,
    Disaster,
    DisasterTask,
    DisasterTaskAssignment,
)
from app.models.responder_management import Team


def _make_basic_user(db_session, role_id=200):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()
    return user


def test_incident_create_and_geometry(db_session):
    user = _make_basic_user(db_session, role_id=201)

    point = Point(77.5, 12.9)
    inc = Incident(
        reported_by_user_id=user.user_id,
        title="Test incident",
        incident_type="accident",
        location=from_shape(point, srid=4326),
    )
    db_session.add(inc)
    db_session.commit()
    db_session.refresh(inc)

    assert inc.status == "open"
    assert inc.reported_at is not None
    assert inc.updated_at is not None

    loaded_point = to_shape(inc.location)
    assert loaded_point.x == pytest.approx(point.x)
    assert loaded_point.y == pytest.approx(point.y)

    # SRID check
    srid = db_session.execute(
        select(func.ST_SRID(Incident.location)).where(
            Incident.incident_id == inc.incident_id
        )
    ).scalar_one()
    assert srid == 4326


def test_incident_invalid_status_check(db_session):
    point = Point(0, 0)
    inc = Incident(
        title="Bad Status",
        incident_type="other",
        location=from_shape(point, srid=4326),
        status="not_valid",
    )
    db_session.add(inc)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_disaster_create_with_affected_area(db_session):
    commander = _make_basic_user(db_session, role_id=202)
    poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])
    point = Point(0.5, 0.5)

    disaster = Disaster(
        title="Test Disaster",
        commander_user_id=commander.user_id,
        disaster_type="flood",
        severity_level="high",
        location=from_shape(point, srid=4326),
        affected_area=from_shape(poly, srid=4326),
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    assert disaster.status == "active"
    assert disaster.severity_level == "high"
    assert disaster.disaster_id is not None
    assert disaster.reported_at is not None
    assert disaster.updated_at is not None


def test_disaster_status_and_severity_checks(db_session):
    commander = _make_basic_user(db_session, role_id=203)
    point = Point(1, 1)

    # invalid status
    d1 = Disaster(
        title="Bad Status",
        commander_user_id=commander.user_id,
        status="not_valid",
        location=from_shape(point, srid=4326),
    )
    db_session.add(d1)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # invalid severity
    d2 = Disaster(
        title="Bad Severity",
        commander_user_id=commander.user_id,
        severity_level="super_critical",
        location=from_shape(point, srid=4326),
    )
    db_session.add(d2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_disaster_task_create_and_default_status_priority(db_session):
    commander = _make_basic_user(db_session, role_id=204)
    point = Point(1, 1)
    disaster = Disaster(
        title="Task Disaster",
        commander_user_id=commander.user_id,
        location=from_shape(point, srid=4326),
    )
    db_session.add(disaster)
    db_session.commit()

    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="medic",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    assert task.status == "pending"
    assert task.priority == "medium"
    assert task.disaster is disaster
    assert "DisasterTask" in repr(task)


def test_disaster_task_status_and_priority_checks(db_session):
    commander = _make_basic_user(db_session, role_id=205)
    point = Point(1, 1)
    disaster = Disaster(
        title="Check Disaster",
        commander_user_id=commander.user_id,
        location=from_shape(point, srid=4326),
    )
    db_session.add(disaster)
    db_session.commit()

    t1 = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="fire",
        status="wrong_status",
    )
    db_session.add(t1)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    t2 = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="fire",
        priority="urgent",
    )
    db_session.add(t2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_disaster_task_assignment_primary_key_and_check(db_session):
    commander = _make_basic_user(db_session, role_id=206)
    point = Point(1, 1)
    disaster = Disaster(
        title="Assign Disaster",
        commander_user_id=commander.user_id,
        location=from_shape(point, srid=4326),
    )
    team = Team(name="Delta", team_type="fire")
    db_session.add_all([disaster, team])
    db_session.commit()

    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="fire",
    )
    db_session.add(task)
    db_session.commit()

    assign = DisasterTaskAssignment(
        task_id=task.task_id,
        team_id=team.team_id,
        status="assigned",
    )
    db_session.add(assign)
    db_session.commit()
    db_session.refresh(assign)

    assert assign.task is task
    assert assign.team is team
    assert "DisasterTaskAssignment" in repr(assign)

    # invalid status
    bad_assign = DisasterTaskAssignment(
        task_id=task.task_id,
        team_id=team.team_id,
        status="bad_status",
    )
    db_session.add(bad_assign)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
