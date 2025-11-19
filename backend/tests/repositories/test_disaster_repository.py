from uuid import uuid4

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.disaster_management import Disaster, Incident
from app.models.questionnaires_and_logs import DisasterFollower, DisasterLog
from app.models.responder_management import Team
from app.models.user_family_models import Role, User
from app.models.mapping_and_tracking import MapSite
from app.repositories.disaster_repository import DisasterRepository


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

    async def flush(self):
        self._session.flush()

    async def commit(self):
        self._session.commit()

    async def refresh(self, instance):
        self._session.refresh(instance)


def _seed_role_and_user(db_session, role_id=910, commander=False, location=None):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id, last_known_location=location)
    db_session.add(user)
    db_session.commit()
    if commander:
        user.role.name = "commander"
    return user


def _make_point(x=77.1, y=12.9):
    return from_shape(Point(x, y), srid=4326)


def test_to_geojson_returns_feature(db_session):
    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    feature = repo._to_geojson(_make_point(), {"name": "Site"})
    assert feature["type"] == "Feature"
    assert feature["properties"]["name"] == "Site"


def test_to_geojson_handles_missing_or_invalid_geometry(db_session):
    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    assert repo._to_geojson(None, {"name": "Missing"}) is None
    class Dummy:
        pass
    assert repo._to_geojson(Dummy(), {"name": "Invalid"}) is None


@pytest.mark.asyncio
async def test_convert_incident_creates_disaster_and_followers(db_session):
    user = _seed_role_and_user(db_session, 911)
    follower = _seed_role_and_user(db_session, 912, location=_make_point())
    incident = Incident(
        reported_by_user_id=user.user_id,
        title="Need conversion",
        incident_type="fire",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    disaster = await repo.convert_incident(
        incident.incident_id,
        {"severity_level": "high", "radius_meters": 15000, "disaster_type": "wildfire"},
    )

    assert isinstance(disaster, Disaster)
    assert disaster.severity_level == "high"
    followers = db_session.query(DisasterFollower).filter_by(disaster_id=disaster.disaster_id).all()
    assert len(followers) == 1
    log = db_session.query(DisasterLog).filter_by(disaster_id=disaster.disaster_id).one()
    assert "Converted from Incident" in log.text_body


@pytest.mark.asyncio
async def test_convert_incident_returns_none_when_missing(db_session):
    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    result = await repo.convert_incident(uuid4(), {"severity_level": "low", "radius_meters": 1})
    assert result is None


@pytest.mark.asyncio
async def test_convert_incident_skips_already_converted(db_session):
    user = _seed_role_and_user(db_session, 917)
    incident = Incident(
        reported_by_user_id=user.user_id,
        title="Converted",
        incident_type="fire",
        location=_make_point(),
        status="converted",
    )
    db_session.add(incident)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    result = await repo.convert_incident(
        incident.incident_id, {"severity_level": "low", "radius_meters": 100}
    )
    assert result is None


@pytest.mark.asyncio
async def test_convert_incident_defaults_type_to_other(db_session):
    user = _seed_role_and_user(db_session, 916)
    incident = Incident(
        reported_by_user_id=user.user_id,
        title="Default Type",
        incident_type=None,
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    disaster = await repo.convert_incident(
        incident.incident_id, {"severity_level": "medium", "radius_meters": 1000}
    )
    assert disaster.disaster_type == "other"


@pytest.mark.asyncio
async def test_get_disasters_filters_by_role(db_session):
    user = _seed_role_and_user(db_session, 913)
    disaster_all = Disaster(
        title="Visible to commanders",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="high",
        location=_make_point(),
    )
    db_session.add(disaster_all)
    contained = Disaster(
        title="Contained",
        description="",
        status="contained",
        disaster_type="storm",
        severity_level="low",
        location=_make_point(),
    )
    db_session.add(contained)
    follower_disaster = Disaster(
        title="Follower only",
        description="",
        status="active",
        disaster_type="flood",
        severity_level="low",
        location=_make_point(),
    )
    db_session.add(follower_disaster)
    db_session.commit()
    db_session.add(DisasterFollower(disaster_id=follower_disaster.disaster_id, user_id=user.user_id))
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    commander_visible = await repo.get_disasters(user.user_id, "commander")
    assert disaster_all in commander_visible
    assert contained in commander_visible

    follower_visible = await repo.get_disasters(user.user_id, "civilian")
    assert follower_disaster in follower_visible
    assert disaster_all not in follower_visible


@pytest.mark.asyncio
async def test_get_disasters_excludes_resolved_status(db_session):
    user = _seed_role_and_user(db_session, 919)
    active = Disaster(
        title="Show me",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="high",
        location=_make_point(),
    )
    resolved = Disaster(
        title="Hide me",
        description="",
        status="resolved",
        disaster_type="fire",
        severity_level="low",
        location=_make_point(),
    )
    db_session.add_all([active, resolved])
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    visible = await repo.get_disasters(user.user_id, "commander")
    assert active in visible
    assert resolved not in visible


@pytest.mark.asyncio
async def test_get_stats_aggregates_logs(db_session):
    user = _seed_role_and_user(db_session, 914)
    disaster = Disaster(
        title="Stats",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="high",
        location=_make_point(),
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.add_all(
        [
            DisasterLog(
                disaster_id=disaster.disaster_id,
                source_type="user_input",
                num_deaths=2,
                num_injuries=5,
                estimated_resource_cost=100.5,
            ),
            DisasterLog(
                disaster_id=disaster.disaster_id,
                source_type="system",
                num_deaths=1,
                num_injuries=0,
                estimated_resource_cost=20,
            ),
        ]
    )
    db_session.add(DisasterFollower(disaster_id=disaster.disaster_id, user_id=user.user_id))
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    stats = await repo.get_stats(disaster.disaster_id)

    assert stats["total_deaths"] == 3
    assert stats["total_injured"] == 5
    assert stats["resources_cost_estimate"] == pytest.approx(120.5)
    assert stats["affected_population_count"] == 1


@pytest.mark.asyncio
async def test_get_stats_returns_zero_when_no_logs(db_session):
    disaster = Disaster(
        title="EmptyStats",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="low",
        location=_make_point(),
    )
    db_session.add(disaster)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    stats = await repo.get_stats(disaster.disaster_id)
    assert stats["total_deaths"] == 0
    assert stats["total_injured"] == 0
    assert stats["resources_cost_estimate"] == 0.0


@pytest.mark.asyncio
async def test_get_map_data_includes_sites_and_teams(db_session):
    disaster = Disaster(
        title="MapData",
        description="",
        status="active",
        disaster_type="flood",
        severity_level="medium",
        location=_make_point(),
    )
    db_session.add(disaster)
    db_session.commit()

    site = MapSite(
        site_id=uuid4(),
        name="Hospital",
        site_type="hospital",
        location=_make_point(),
        status="open",
    )
    db_session.add(site)

    commander = _seed_role_and_user(db_session, 915, location=_make_point())
    team = Team(
        name="Medic Team",
        team_type="medic",
        commander_user_id=commander.user_id,
        status="deployed",
    )
    db_session.add(team)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    data = await repo.get_map_data(disaster.disaster_id, include_teams=True)

    assert data["disaster_location"] is not None
    assert any(site["properties"]["name"] == "Hospital" for site in data["critical_infrastructure"])
    assert data["active_teams"]  # not empty


@pytest.mark.asyncio
async def test_get_map_data_missing_returns_none(db_session):
    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    assert await repo.get_map_data(uuid4()) is None


@pytest.mark.asyncio
async def test_close_disaster_updates_status(db_session):
    disaster = Disaster(
        title="Close",
        description="",
        status="active",
        disaster_type="fire",
        severity_level="low",
        location=_make_point(),
    )
    db_session.add(disaster)
    db_session.commit()

    repo = DisasterRepository(AsyncSessionAdapter(db_session))
    await repo.close_disaster(disaster.disaster_id)
    db_session.refresh(disaster)

    assert disaster.status == "resolved"
    assert disaster.resolved_at is not None
