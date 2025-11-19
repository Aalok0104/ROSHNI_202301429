from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.routers import incidents, disasters, tasks


def _point(x=77.0, y=12.0):
    return from_shape(Point(x, y), srid=4326)


def test_format_incident_response_builds_media_urls():
    media = SimpleNamespace(
        media_id=uuid4(),
        file_type="image",
        storage_path="/tmp/uploads/sample.jpg",
    )
    incident = SimpleNamespace(
        incident_id=uuid4(),
        reported_by_user_id=uuid4(),
        title="Title",
        description="Details",
        incident_type="fire",
        status="open",
        reported_at=datetime.utcnow(),
        location=_point(),
        media=[media],
    )

    response = incidents.format_incident_response(incident)
    assert response.latitude == pytest.approx(12.0)
    assert response.incident_type == "fire"
    assert response.media[0].url.endswith("sample.jpg")


def test_format_incident_response_handles_missing_geometry():
    incident = SimpleNamespace(
        incident_id=uuid4(),
        reported_by_user_id=uuid4(),
        title="No Geo",
        description=None,
        incident_type="sos",
        status="open",
        reported_at=datetime.utcnow(),
        location=None,
        media=[],
    )

    response = incidents.format_incident_response(incident)
    assert response.latitude == 0.0
    assert response.longitude == 0.0
    assert response.media == []


def test_format_disaster_response_handles_missing_geometry():
    disaster = SimpleNamespace(
        disaster_id=uuid4(),
        title="Event",
        description="",
        disaster_type="flood",
        status="active",
        severity_level="high",
        location=None,
    )

    response = disasters.format_disaster_response(disaster)
    assert response.latitude == 0.0
    assert response.longitude == 0.0
    assert response.description == ""


def test_format_disaster_response_extracts_coordinates():
    disaster = SimpleNamespace(
        disaster_id=uuid4(),
        title="Located",
        description="Somewhere",
        disaster_type="storm",
        status="ongoing",
        severity_level="medium",
        location=_point(72.0, 18.0),
    )

    response = disasters.format_disaster_response(disaster)
    assert response.latitude == pytest.approx(18.0)
    assert response.longitude == pytest.approx(72.0)


def test_format_task_response_includes_assignments():
    assignment = SimpleNamespace(
        team_id=uuid4(),
        team=SimpleNamespace(name="Alpha"),
        status="assigned",
        eta=None,
        arrived_at=None,
    )
    task_obj = SimpleNamespace(
        task_id=uuid4(),
        disaster_id=uuid4(),
        task_type="medic",
        description="Help",
        priority="high",
        status="pending",
        location=_point(10, 20),
        created_at=datetime.utcnow(),
        assignments=[assignment],
    )

    response = tasks.format_task_response(task_obj)
    assert response.latitude == pytest.approx(20.0)
    assert response.assignments[0].team_name == "Alpha"


def test_format_task_response_uses_unknown_team_when_missing():
    assignment = SimpleNamespace(
        team_id=uuid4(),
        team=None,
        status="assigned",
        eta=None,
        arrived_at=None,
    )
    task_obj = SimpleNamespace(
        task_id=uuid4(),
        disaster_id=uuid4(),
        task_type="medic",
        description="Help",
        priority="high",
        status="pending",
        location=None,
        created_at=datetime.utcnow(),
        assignments=[assignment],
    )
    response = tasks.format_task_response(task_obj)
    assert response.assignments[0].team_name == "Unknown Team"
    assert response.latitude == 0.0
    assert response.longitude == 0.0
