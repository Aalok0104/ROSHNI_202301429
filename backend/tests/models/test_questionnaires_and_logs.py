# tests/test_questionnaires_and_logs.py
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user_family_models import Role, User
from app.models.disaster_management import Disaster, Incident
from app.models.questionnaires_and_logs import (
    DisasterFollower,
    QuestionTemplate,
    DisasterQuestionState,
    DisasterLog,
    DisasterMedia,
    DisasterChatMessage,
    IncidentMedia,
)
from geoalchemy2.shape import from_shape
from shapely.geometry import Point


def _make_disaster(db_session, role_id=300):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    user = User(role_id=role.role_id)
    db_session.add(user)
    db_session.commit()
    d = Disaster(
        title="Q Disaster",
        commander_user_id=user.user_id,
        location=from_shape(Point(1, 1), srid=4326),
    )
    db_session.add(d)
    db_session.commit()
    return d, user


def _make_incident(db_session, role_id=400):
    role = Role(role_id=role_id, name=f"role_{role_id}")
    db_session.add(role)
    db_session.commit()
    reporter = User(role_id=role.role_id)
    db_session.add(reporter)
    db_session.commit()
    incident = Incident(
        reported_by_user_id=reporter.user_id,
        title="Incident Example",
        location=from_shape(Point(2, 2), srid=4326),
    )
    db_session.add(incident)
    db_session.commit()
    return incident, reporter


def test_disaster_follower_cascade(db_session):
    disaster, user = _make_disaster(db_session, role_id=301)

    follower = DisasterFollower(
        disaster_id=disaster.disaster_id,
        user_id=user.user_id,
    )
    db_session.add(follower)
    db_session.commit()

    # Deleting disaster cascades
    d_id = disaster.disaster_id
    db_session.delete(disaster)
    db_session.commit()

    assert db_session.get(DisasterFollower, {"disaster_id": d_id, "user_id": user.user_id}) is None


def test_question_template_basic_and_answer_type_check(db_session):
    qt = QuestionTemplate(
        key="new_casualties",
        question_text="Any new casualties?",
        answer_type="boolean",
    )
    db_session.add(qt)
    db_session.commit()
    db_session.refresh(qt)

    assert qt.question_id is not None
    assert qt.answer_type == "boolean"
    assert "QuestionTemplate" in repr(qt)

    bad_qt = QuestionTemplate(
        key="bad_type",
        question_text="Bad?",
        answer_type="not_allowed",
    )
    db_session.add(bad_qt)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_question_template_unique_key(db_session):
    qt1 = QuestionTemplate(
        key="unique_key",
        question_text="Q1",
        answer_type="text",
    )
    qt2 = QuestionTemplate(
        key="unique_key",
        question_text="Q2",
        answer_type="text",
    )
    db_session.add_all([qt1, qt2])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_disaster_question_state_composite_pk(db_session):
    disaster, user = _make_disaster(db_session, role_id=302)
    qt = QuestionTemplate(
        key="medics_sufficient",
        question_text="Do we have enough medics?",
        answer_type="boolean",
    )
    db_session.add(qt)
    db_session.commit()

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=qt.question_id,
        last_answer_value="true",
        last_answered_by_user_id=user.user_id,
    )
    db_session.add(state)
    db_session.commit()
    db_session.refresh(state)

    assert state.disaster_id == disaster.disaster_id
    assert state.question_id == qt.question_id
    assert "DisasterQuestionState" in repr(state)


def test_disaster_log_checks_and_media_relationship(db_session):
    disaster, user = _make_disaster(db_session, role_id=303)

    log = DisasterLog(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        source_type="user_input",
        title="Initial Report",
        num_deaths=0,
        num_injuries=1,
        help_required=1,
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)

    assert log.log_id is not None
    assert log.disaster_id == disaster.disaster_id
    assert "DisasterLog" in repr(log)

    # invalid source type
    bad_log = DisasterLog(
        disaster_id=disaster.disaster_id,
        source_type="not_valid",
    )
    db_session.add(bad_log)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # media
    media = DisasterMedia(
        log_id=log.log_id,
        file_type="image",
        storage_path="/path/to/file.jpg",
    )
    db_session.add(media)
    db_session.commit()

    db_session.refresh(log)
    assert len(log.media_items) == 1
    assert log.media_items[0] is media
    assert "DisasterMedia" in repr(media)


def test_disaster_media_file_type_check(db_session):
    disaster, user = _make_disaster(db_session, role_id=304)

    log = DisasterLog(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        source_type="system",
    )
    db_session.add(log)
    db_session.commit()

    bad_media = DisasterMedia(
        log_id=log.log_id,
        file_type="not_allowed",
        storage_path="/bad",
    )
    db_session.add(bad_media)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_disaster_chat_message_basic(db_session):
    """
    Integration-style test covering questionnaires and logs models plus
    the updated chat message fields (team/global), media and followers.
    """
    # Create a disaster and user using helper
    disaster, user = _make_disaster(db_session, role_id=305)

    # --- Question template and state ---
    qt = QuestionTemplate(key="integration_q", question_text="Is area safe?", answer_type="boolean")
    db_session.add(qt)
    db_session.commit()
    db_session.refresh(qt)
    assert qt.question_id is not None

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=qt.question_id,
        last_answer_value="true",
        last_answered_by_user_id=user.user_id,
    )
    db_session.add(state)
    db_session.commit()
    db_session.refresh(state)
    assert state.disaster_id == disaster.disaster_id

    # --- Disaster log and media ---
    log = DisasterLog(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        source_type="user_input",
        title="Initial report",
        text_body="Some details",
        num_deaths=0,
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)

    media = DisasterMedia(log_id=log.log_id, uploaded_by_user_id=user.user_id, file_type="image", storage_path="/tmp/img.jpg")
    db_session.add(media)
    db_session.commit()
    db_session.refresh(log)
    assert len(log.media_items) == 1

    # --- Chat messages: team-scoped and global ---
    from uuid import uuid4
    from app.models.responder_management import Team

    team = Team(team_id=uuid4(), name="Integration Team", team_type="disaster_response", commander_user_id=user.user_id)
    db_session.add(team)
    db_session.commit()

    team_msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        team_id=team.team_id,
        sender_user_id=user.user_id,
        message_text="Team is en route",
        is_global=False,
    )

    global_msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=user.user_id,
        message_text="All logisticians, report status",
        is_global=True,
    )

    db_session.add_all([team_msg, global_msg])
    db_session.commit()

    # verify messages persisted correctly
    team_res = db_session.query(DisasterChatMessage).filter_by(disaster_id=disaster.disaster_id, team_id=team.team_id, is_global=False).one_or_none()
    assert team_res is not None and team_res.message_text == "Team is en route"

    global_res = db_session.query(DisasterChatMessage).filter_by(disaster_id=disaster.disaster_id, is_global=True).one_or_none()
    assert global_res is not None and global_res.message_text == "All logisticians, report status"

    # --- Disaster follower ---
    follower = DisasterFollower(disaster_id=disaster.disaster_id, user_id=user.user_id)
    db_session.add(follower)
    db_session.commit()
    assert db_session.get(DisasterFollower, {"disaster_id": disaster.disaster_id, "user_id": user.user_id}) is not None

    # --- Incident media relationship sanity check ---
    incident, reporter = _make_incident(db_session, role_id=401)
    im = IncidentMedia(incident_id=incident.incident_id, uploaded_by_user_id=reporter.user_id, file_type="image", storage_path="/tmp/incident.jpg")
    db_session.add(im)
    db_session.commit()
    db_session.refresh(incident)
    assert len(incident.media_items) == 1


def test_incident_media_relationship(db_session):
    incident, reporter = _make_incident(db_session, role_id=401)

    media = IncidentMedia(
        incident_id=incident.incident_id,
        uploaded_by_user_id=reporter.user_id,
        file_type="video",
        storage_path="/media/incident.mp4",
    )
    db_session.add(media)
    db_session.commit()

    db_session.refresh(incident)
    assert len(incident.media_items) == 1
    assert incident.media_items[0] is media
    assert "IncidentMedia" in repr(media)


def test_incident_media_file_type_validation(db_session):
    incident, _ = _make_incident(db_session, role_id=402)

    bad_media = IncidentMedia(
        incident_id=incident.incident_id,
        file_type="invalid",
        storage_path="/bad",
    )
    db_session.add(bad_media)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
