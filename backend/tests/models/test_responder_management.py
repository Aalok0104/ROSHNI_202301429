# tests/test_responder_management.py
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user_family_models import Role, User
from app.models.responder_management import Team, ResponderProfile


def _make_user(db_session, role_id=100):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()
    return user


def test_team_basic_create_and_checks(db_session):
    commander = _make_user(db_session, role_id=101)

    team = Team(
        name="Alpha",
        team_type="medic",
        commander_user_id=commander.user_id,
    )
    db_session.add(team)
    db_session.commit()
    db_session.refresh(team)

    assert team.team_id is not None
    assert team.status == "available"
    assert "Alpha" in repr(team)


def test_team_invalid_type_violates_check(db_session):
    team = Team(
        name="BadTeam",
        team_type="invalid_type",
    )
    db_session.add(team)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_team_invalid_status_violates_check(db_session):
    team = Team(
        name="BadStatus",
        team_type="medic",
        status="unknown",
    )
    db_session.add(team)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_responder_profile_basic_create_and_checks(db_session):
    user = _make_user(db_session, role_id=102)
    team = Team(name="Bravo", team_type="medic")
    db_session.add(team)
    db_session.commit()

    responder = ResponderProfile(
        user_id=user.user_id,
        team_id=team.team_id,
        responder_type="medic",
        status="active",
    )
    db_session.add(responder)
    db_session.commit()

    assert responder.team is team
    assert responder.user_id == user.user_id
    assert responder.status == "active"
    assert "ResponderProfile" in repr(responder)


def test_responder_profile_invalid_type_and_status_checks(db_session):
    user = _make_user(db_session, role_id=103)

    resp = ResponderProfile(
        user_id=user.user_id,
        responder_type="not_allowed",
        status="active",
    )
    db_session.add(resp)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # valid type but invalid status
    resp2 = ResponderProfile(
        user_id=user.user_id,
        responder_type="medic",
        status="not_valid",
    )
    db_session.add(resp2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_team_responder_relationship_collection(db_session):
    user = _make_user(db_session, role_id=104)
    team = Team(name="Charlie", team_type="police")
    db_session.add(team)
    db_session.commit()

    resp = ResponderProfile(
        user_id=user.user_id, team_id=team.team_id, responder_type="police"
    )
    db_session.add(resp)
    db_session.commit()

    db_session.refresh(team)
    assert len(team.responder_profiles) == 1
    assert team.responder_profiles[0] is resp
