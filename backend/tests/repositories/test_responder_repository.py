from uuid import uuid4

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.responder_management import ResponderProfile, Team
from app.models.user_family_models import Role, User, UserProfile
from app.repositories.responder_repository import ResponderRepository


class AsyncSessionAdapter:
    def __init__(self, session):
        self._session = session

    def add(self, instance):
        self._session.add(instance)

    def add_all(self, instances):
        self._session.add_all(instances)

    async def execute(self, statement):
        return self._session.execute(statement)

    async def flush(self):
        self._session.flush()

    async def commit(self):
        self._session.commit()

    async def refresh(self, instance):
        self._session.refresh(instance)


def _seed_commander(db_session, role_id=920):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id, last_known_location=from_shape(Point(77, 12), srid=4326))
    db_session.add(user)
    db_session.commit()
    profile = UserProfile(user_id=user.user_id, full_name="Commander")
    db_session.add(profile)
    db_session.commit()
    return user


def _ensure_responder_role(db_session):
    if db_session.get(Role, 2) is None:
        db_session.add(Role(role_id=2, name="responder"))
        db_session.commit()


@pytest.mark.asyncio
async def test_create_and_list_teams_with_filters(db_session):
    commander = _seed_commander(db_session, 921)
    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    team = await repo.create_team(
        {
            "name": "Alpha",
            "team_type": "medic",
            "commander_user_id": commander.user_id,
            "status": "available",
        }
    )

    # Add members to check aggregation
    for idx in range(2):
        member = User(role_id=commander.role_id)
        db_session.add(member)
        db_session.commit()
        db_session.add(UserProfile(user_id=member.user_id, full_name=f"Member {idx}"))
        db_session.add(
            ResponderProfile(
                user_id=member.user_id,
                team_id=team.team_id,
                responder_type="medic",
                badge_number=f"A{idx}",
            )
        )
    db_session.commit()

    teams = await repo.get_teams_with_location(status_filter="available", type_filter="medic")
    assert teams[0]["member_count"] == 2
    assert teams[0]["current_latitude"] is not None


@pytest.mark.asyncio
async def test_create_responder_inserts_all_entities(db_session):
    _ensure_responder_role(db_session)
    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    data = {
        "email": "responder@example.com",
        "full_name": "Responder One",
        "responder_type": "medic",
        "badge_number": "R-1",
        "team_id": None,
    }
    created = await repo.create_responder(data)

    user = db_session.query(User).filter_by(email="responder@example.com").one()
    profile = db_session.get(UserProfile, user.user_id)
    resp_profile = db_session.get(ResponderProfile, user.user_id)

    assert created["user_id"] == user.user_id
    assert profile.full_name == "Responder One"
    assert resp_profile.badge_number == "R-1"


@pytest.mark.asyncio
async def test_create_responder_links_team(db_session):
    _ensure_responder_role(db_session)
    commander = _seed_commander(db_session, 931)
    team = Team(name="Linked", team_type="medic", commander_user_id=commander.user_id, status="available")
    db_session.add(team)
    db_session.commit()

    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    data = {
        "email": "linked@example.com",
        "full_name": "Linked Member",
        "responder_type": "medic",
        "badge_number": "L-1",
        "team_id": str(team.team_id),
    }
    created = await repo.create_responder(data)
    profile = db_session.get(ResponderProfile, created["user_id"])
    assert profile.team_id == team.team_id


@pytest.mark.asyncio
async def test_get_all_responders_applies_filters(db_session):
    commander = _seed_commander(db_session, 922)
    team = Team(name="Bravo", team_type="fire", commander_user_id=commander.user_id, status="available")
    db_session.add(team)
    db_session.commit()
    other_team = Team(name="Echo", team_type="fire", commander_user_id=commander.user_id, status="available")
    db_session.add(other_team)
    db_session.commit()

    user = User(role_id=commander.role_id, email="filter@example.com", last_known_location=from_shape(Point(77, 12), srid=4326))
    db_session.add(user)
    db_session.commit()
    db_session.add(UserProfile(user_id=user.user_id, full_name="Filter"))
    db_session.add(
        ResponderProfile(
            user_id=user.user_id,
            responder_type="firefighter",
            badge_number="F-1",
            team_id=team.team_id,
            status="active",
        )
    )
    teammate = User(role_id=commander.role_id, email="teammate@example.com")
    db_session.add(teammate)
    db_session.commit()
    db_session.add(UserProfile(user_id=teammate.user_id, full_name="Same Type"))
    db_session.add(
        ResponderProfile(
            user_id=teammate.user_id,
            responder_type="firefighter",
            badge_number="F-4",
            team_id=other_team.team_id,
            status="active",
        )
    )
    alt_user = User(role_id=commander.role_id, email="alt@example.com")
    db_session.add(alt_user)
    db_session.commit()
    db_session.add(UserProfile(user_id=alt_user.user_id, full_name="Alt"))
    db_session.add(
        ResponderProfile(
            user_id=alt_user.user_id,
            responder_type="medic",
            badge_number="F-2",
            team_id=None,
            status="retired",
        )
    )
    retired_same_team = User(role_id=commander.role_id, email="retired@example.com")
    db_session.add(retired_same_team)
    db_session.commit()
    db_session.add(UserProfile(user_id=retired_same_team.user_id, full_name="Retired"))
    db_session.add(
        ResponderProfile(
            user_id=retired_same_team.user_id,
            responder_type="firefighter",
            badge_number="F-5",
            team_id=team.team_id,
            status="retired",
        )
    )
    db_session.commit()

    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    responders = await repo.get_all_responders({"team_id": team.team_id, "responder_type": "firefighter", "status": "active"})
    assert len(responders) == 1
    assert responders[0]["team_name"] == "Bravo"
    assert responders[0]["full_name"] == "Filter"
    assert responders[0]["last_known_latitude"] == pytest.approx(12)
    assert responders[0]["badge_number"] == "F-1"


@pytest.mark.asyncio
async def test_get_all_responders_filters_by_type_without_team_filter(db_session):
    commander = _seed_commander(db_session, 926)
    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    for type_name in ("firefighter", "medic"):
        user = User(role_id=commander.role_id, email=f"{type_name}@example.com")
        db_session.add(user)
        db_session.commit()
        db_session.add(UserProfile(user_id=user.user_id, full_name=type_name.title()))
        db_session.add(
            ResponderProfile(
                user_id=user.user_id,
                responder_type=type_name,
                badge_number=f"BADGE-{type_name}",
                status="active",
            )
        )
    db_session.commit()

    responders = await repo.get_all_responders({"responder_type": "firefighter"})
    assert len(responders) == 1
    assert responders[0]["responder_type"] == "firefighter"


@pytest.mark.asyncio
async def test_update_responder_sets_team_join_timestamp(db_session):
    commander = _seed_commander(db_session, 923)
    team = Team(name="Charlie", team_type="medic", commander_user_id=commander.user_id, status="available")
    db_session.add(team)
    db_session.commit()

    user = User(role_id=commander.role_id, email="update@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.add(UserProfile(user_id=user.user_id, full_name="Update User"))
    db_session.add(
        ResponderProfile(
            user_id=user.user_id,
            responder_type="medic",
            badge_number="M-1",
            status="active",
        )
    )
    db_session.commit()

    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    updated = await repo.update_responder(
        user.user_id, {"status": "suspended", "team_id": str(team.team_id)}
    )

    assert updated["status"] == "suspended"
    profile = db_session.get(ResponderProfile, user.user_id)
    assert profile.team_joined_at is not None


@pytest.mark.asyncio
async def test_get_responder_detail_returns_none_for_missing(db_session):
    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    detail = await repo.get_responder_detail(uuid4())
    assert detail is None


@pytest.mark.asyncio
async def test_get_responder_detail_populates_fields(db_session):
    commander = _seed_commander(db_session, 924)
    team = Team(name="Delta", team_type="fire", commander_user_id=commander.user_id, status="available")
    db_session.add(team)
    db_session.commit()

    responder = User(role_id=commander.role_id, email="detail@example.com", last_known_location=from_shape(Point(80, 13), srid=4326))
    db_session.add(responder)
    db_session.commit()
    db_session.add(UserProfile(user_id=responder.user_id, full_name="Detail"))
    db_session.add(
        ResponderProfile(
            user_id=responder.user_id,
            responder_type="firefighter",
            badge_number="F-9",
            team_id=team.team_id,
            status="active",
        )
    )
    db_session.commit()

    repo = ResponderRepository(AsyncSessionAdapter(db_session))
    detail = await repo.get_responder_detail(responder.user_id)
    assert detail["team_name"] == "Delta"
    assert detail["last_known_latitude"] == pytest.approx(13)
