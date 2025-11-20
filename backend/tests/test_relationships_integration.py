# tests/test_relationships_integration.py
import sys
print(sys.modules.keys())
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.models.user_family_models import Role, User
from app.models.disaster_management import Incident, Disaster, DisasterTask
from app.models.questionnaires_and_logs import DisasterLog
from app.models.responder_management import Team, ResponderProfile


def test_incident_to_disaster_source_incident_relationship(db_session):
    role = Role(role_id=600, name="role_600")
    db_session.add(role)
    db_session.commit()

    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()

    inc = Incident(
        reported_by_user_id=user.user_id,
        title="Source Incident",
        location=from_shape(Point(1, 1), srid=4326),
    )
    db_session.add(inc)
    db_session.commit()

    disaster = Disaster(
        title="From Incident",
        commander_user_id=user.user_id,
        source_incident_id=inc.incident_id,
        location=from_shape(Point(1, 1), srid=4326),
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    assert disaster.source_incident is inc


def test_disaster_has_tasks_and_logs(db_session):
    role = Role(role_id=601, name="role_601")
    db_session.add(role)
    db_session.commit()
    commander = User(role_id=role.role_id)
    db_session.add(commander)
    db_session.commit()

    disaster = Disaster(
        title="Rel Disaster",
        commander_user_id=commander.user_id,
        location=from_shape(Point(1, 1), srid=4326),
    )
    db_session.add(disaster)
    db_session.commit()

    task = DisasterTask(
        disaster_id=disaster.disaster_id,
        created_by_commander_id=commander.user_id,
        task_type="search_rescue",
    )
    log = DisasterLog(
        disaster_id=disaster.disaster_id,
        source_type="system",
        title="Initial",
    )
    db_session.add_all([task, log])
    db_session.commit()

    db_session.refresh(disaster)
    assert len(disaster.tasks) == 1
    assert disaster.tasks[0] is task

    # Disaster <-> DisasterLog relationship is not explicit in models,
    # but queries should still work with foreign keys.
    logs = (
        db_session.query(DisasterLog)
        .filter(DisasterLog.disaster_id == disaster.disaster_id)
        .all()
    )
    assert len(logs) == 1
    assert logs[0] is log
