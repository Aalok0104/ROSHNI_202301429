# tests/test_draft_reports.py
import pytest
from sqlalchemy.exc import IntegrityError
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.user_family_models import Role, User
from app.models.disaster_management import Disaster
from app.models.draft_reports import DisasterReportDraft


def _make_disaster_for_report(db_session, role_id=500):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    commander = User(role_id=role.role_id)
    db_session.add(commander)
    db_session.commit()
    d = Disaster(
        title="Report Disaster",
        commander_user_id=commander.user_id,
        location=from_shape(Point(1, 1), srid=4326),
    )
    db_session.add(d)
    db_session.commit()
    return d, commander


def test_disaster_report_draft_basic_and_defaults(db_session):
    disaster, commander = _make_disaster_for_report(db_session, role_id=501)

    draft = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=commander.user_id,
        version_number=1,
        disaster_name_snapshot=disaster.title,
        estimated_deaths=0,
        estimated_casualties=5,
    )
    db_session.add(draft)
    db_session.commit()
    db_session.refresh(draft)

    assert draft.report_id is not None
    assert draft.status == "draft"
    assert "DisasterReportDraft" in repr(draft)


def test_disaster_report_draft_status_check_and_unique_version(db_session):
    disaster, commander = _make_disaster_for_report(db_session, role_id=502)

    # invalid status
    bad = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=commander.user_id,
        version_number=1,
        status="not_valid",
    )
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    d1 = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=commander.user_id,
        version_number=1,
    )
    d2 = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=commander.user_id,
        version_number=1,
    )
    db_session.add_all([d1, d2])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
