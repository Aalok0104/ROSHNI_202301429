from datetime import datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.disaster_management import Disaster, Incident
from app.models.questionnaires_and_logs import DisasterFollower, DisasterLog, IncidentMedia
from app.models.user_family_models import Role, User
from app.repositories import incident_repository as incident_repo_module
from app.repositories.incident_repository import IncidentRepository


class AsyncSessionAdapter:
    """Minimal async facade for the synchronous SQLAlchemy session fixture."""

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


def _seed_role_and_user(db_session, role_id=900):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()
    return user


def _make_point(x=77.0, y=12.0):
    return from_shape(Point(x, y), srid=4326)


@pytest.mark.asyncio
async def test_find_duplicate_incident_detects_recent_match(db_session):
    reporter = _seed_role_and_user(db_session, 901)
    now = datetime.utcnow()
    existing = Incident(
        reported_by_user_id=reporter.user_id,
        title="Existing",
        incident_type="fire",
        location=_make_point(),
        status="open",
        reported_at=now,
    )
    db_session.add(existing)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    duplicate = await repo.find_duplicate_incident(
        lat=12.0, lon=77.0, incident_type="fire"
    )

    assert duplicate is not None
    assert duplicate.incident_id == existing.incident_id


@pytest.mark.asyncio
async def test_find_duplicate_incident_includes_boundary_records(db_session, monkeypatch):
    reporter = _seed_role_and_user(db_session, 9011)
    fixed_now = datetime(2024, 1, 1, 12, 0, 0)
    monkeypatch.setattr(incident_repo_module, "datetime", SimpleNamespace(utcnow=lambda: fixed_now))
    boundary = Incident(
        reported_by_user_id=reporter.user_id,
        title="Boundary",
        incident_type="fire",
        location=_make_point(),
        status="open",
        reported_at=fixed_now - timedelta(minutes=60),
    )
    db_session.add(boundary)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    duplicate = await repo.find_duplicate_incident(
        lat=12.0, lon=77.0, incident_type="fire"
    )
    assert duplicate is not None


@pytest.mark.asyncio
async def test_find_duplicate_incident_ignores_old_records(db_session):
    reporter = _seed_role_and_user(db_session, 902)
    old_incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Old",
        incident_type="fire",
        location=_make_point(),
        status="open",
        reported_at=datetime.utcnow() - timedelta(hours=5),
    )
    db_session.add(old_incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    duplicate = await repo.find_duplicate_incident(
        lat=12.0, lon=77.0, incident_type="fire"
    )

    assert duplicate is None


@pytest.mark.asyncio
async def test_find_duplicate_incident_checks_radius(db_session):
    reporter = _seed_role_and_user(db_session, 9021)
    far_incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Far",
        incident_type="fire",
        location=_make_point(x=77.5, y=13.0),
        status="open",
        reported_at=datetime.utcnow(),
    )
    db_session.add(far_incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    duplicate = await repo.find_duplicate_incident(lat=12.0, lon=77.0, incident_type="fire")
    assert duplicate is None


@pytest.mark.asyncio
async def test_find_duplicate_incident_requires_matching_type(db_session):
    reporter = _seed_role_and_user(db_session, 9022)
    mismatch = Incident(
        reported_by_user_id=reporter.user_id,
        title="Different type",
        incident_type="chemical",
        location=_make_point(),
        status="open",
        reported_at=datetime.utcnow(),
    )
    db_session.add(mismatch)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    duplicate = await repo.find_duplicate_incident(lat=12.0, lon=77.0, incident_type="fire")
    assert duplicate is None


@pytest.mark.asyncio
async def test_create_incident_applies_sos_defaults(db_session):
    reporter = _seed_role_and_user(db_session, 903)
    payload = SimpleNamespace(
        title=None,
        description=None,
        incident_type=None,
        latitude=12.5,
        longitude=77.5,
    )
    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    created = await repo.create_incident(reporter.user_id, payload, is_sos=True)

    assert created.title == "SOS: Emergency Alert"
    assert created.incident_type == "sos"
    assert created.description.startswith("One-tap")
    assert created.status == "open"


@pytest.mark.asyncio
async def test_create_incident_uses_payload_values_for_regular_reports(db_session):
    reporter = _seed_role_and_user(db_session, 909)
    payload = SimpleNamespace(
        title="Custom",
        description="Manual report",
        incident_type="flood",
        latitude=10.0,
        longitude=20.0,
    )
    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    created = await repo.create_incident(reporter.user_id, payload)

    assert created.title == "Custom"
    assert created.incident_type == "flood"


@pytest.mark.asyncio
async def test_add_media_links_files(db_session):
    reporter = _seed_role_and_user(db_session, 904)
    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Media",
        incident_type="fire",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    media = await repo.add_media(
        incident.incident_id,
        reporter.user_id,
        {"file_type": "image", "mime_type": "image/png", "storage_path": "/tmp/file.png"},
    )

    stored = db_session.get(IncidentMedia, media.media_id)
    assert stored.mime_type == "image/png"
    assert stored.incident_id == incident.incident_id


@pytest.mark.asyncio
async def test_get_all_open_incidents_returns_only_active(db_session):
    reporter = _seed_role_and_user(db_session, 912)
    open_incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Open",
        incident_type="fire",
        location=_make_point(),
        status="open",
    )
    closed_incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Closed",
        incident_type="fire",
        location=_make_point(),
        status="converted",
    )
    db_session.add_all([open_incident, closed_incident])
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    incidents = await repo.get_all_open_incidents()
    assert len(incidents) == 1
    assert incidents[0].title == "Open"


@pytest.mark.asyncio
async def test_discard_incident_marks_status(db_session):
    reporter = _seed_role_and_user(db_session, 905)
    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Discard",
        incident_type="fire",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    await repo.discard_incident(incident.incident_id)
    db_session.refresh(incident)

    assert incident.status == "discarded"


@pytest.mark.asyncio
async def test_convert_to_disaster_creates_log_and_followers(db_session):
    reporter = _seed_role_and_user(db_session, 906)
    follower = _seed_role_and_user(db_session, 907)
    follower.last_known_location = _make_point()
    db_session.commit()

    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Convert",
        description="Details",
        incident_type="earthquake",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    disaster = await repo.convert_to_disaster(
        incident.incident_id, severity="critical", disaster_type="quake"
    )

    assert isinstance(disaster, Disaster)
    assert disaster.severity_level == "critical"
    assert disaster.disaster_type == "quake"

    followers = db_session.query(DisasterFollower).filter_by(disaster_id=disaster.disaster_id).all()
    assert len(followers) == 1
    log = db_session.query(DisasterLog).filter_by(disaster_id=disaster.disaster_id).one()
    assert "Disaster initialized" in log.text_body
    assert log.title == "Disaster Declared"


@pytest.mark.asyncio
async def test_convert_to_disaster_second_call_is_idempotent(db_session):
    reporter = _seed_role_and_user(db_session, 908)
    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Repeat",
        incident_type="fire",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    first = await repo.convert_to_disaster(incident.incident_id, severity="high")
    assert isinstance(first, Disaster)

    second = await repo.convert_to_disaster(incident.incident_id, severity="high")
    assert second is True


@pytest.mark.asyncio
async def test_convert_to_disaster_missing_returns_none(db_session):
    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    result = await repo.convert_to_disaster(uuid4(), severity="low")
    assert result is None


@pytest.mark.asyncio
async def test_convert_to_disaster_uses_incident_type_when_not_provided(db_session):
    reporter = _seed_role_and_user(db_session, 913)
    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="From Incident",
        incident_type="storm",
        location=_make_point(),
        status="open",
    )
    db_session.add(incident)
    db_session.commit()

    repo = IncidentRepository(AsyncSessionAdapter(db_session))
    disaster = await repo.convert_to_disaster(incident.incident_id, severity="high")
    assert disaster.disaster_type == "storm"
