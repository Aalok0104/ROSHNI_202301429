# tests/test_mapping_and_tracking.py
import pytest
from sqlalchemy.exc import IntegrityError
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

from app.models.user_family_models import Role, User
from app.models.mapping_and_tracking import MapSite, UserLocationLog


def _make_user_for_tracking(db_session, role_id=400):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()
    return user


def test_map_site_basic_and_checks(db_session):
    site = MapSite(
        name="Safe Zone 1",
        site_type="safe_zone",
        location=from_shape(Point(10, 20), srid=4326),
        capacity=100,
        current_occupancy=10,
        status="open",
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    assert site.site_id is not None
    assert site.status == "open"
    assert "MapSite" in repr(site)


def test_map_site_invalid_type_and_status_checks(db_session):
    bad_site = MapSite(
        name="Bad",
        site_type="not_valid",
        location=from_shape(Point(0, 0), srid=4326),
    )
    db_session.add(bad_site)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    bad_status = MapSite(
        name="BadStatus",
        site_type="safe_zone",
        status="unknown",
        location=from_shape(Point(0, 0), srid=4326),
    )
    db_session.add(bad_status)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_user_location_log_basic(db_session):
    user = _make_user_for_tracking(db_session, role_id=401)
    point = Point(1, 2)
    log = UserLocationLog(
        user_id=user.user_id,
        location=from_shape(point, srid=4326),
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)

    assert log.location_log_id is not None
    assert log.user_id == user.user_id
    assert "UserLocationLog" in repr(log)

    loaded = to_shape(log.location)
    assert loaded.x == pytest.approx(point.x)
    assert loaded.y == pytest.approx(point.y)
