import pytest
from types import SimpleNamespace
from uuid import uuid4
from datetime import datetime, timedelta

from app.models.questionnaires_and_logs import QuestionTemplate
from app.models.questionnaires_and_logs import DisasterQuestionState
from app.routers import surveys as surveys_router
from app.schemas.surveys import SurveyAnswerRequest


def _civilian_stub(user_id):
    return SimpleNamespace(user_id=user_id, role=SimpleNamespace(name="civilian"))


@pytest.mark.asyncio
async def test_get_pending_survey_no_templates(async_create_user, async_create_disaster, async_db_session):
    user = await async_create_user()
    disaster = await async_create_disaster()

    result = await surveys_router.get_pending_survey(
        disaster_id=disaster.disaster_id,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_pending_survey_with_template(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="medics",
        question_text="Need medics?",
        answer_type="boolean",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    result = await surveys_router.get_pending_survey(
        disaster_id=disaster.disaster_id,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert result is not None
    assert result.key == "medics"


@pytest.mark.asyncio
async def test_submit_answer_creates_log(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="deaths_seen",
        question_text="Deaths seen?",
        answer_type="integer",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    payload = SurveyAnswerRequest(disaster_id=disaster.disaster_id, answer_value=5)
    response = await surveys_router.submit_answer(
        question_id=tmpl.question_id,
        payload=payload,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert response.log_id is not None


@pytest.mark.asyncio
async def test_get_pending_survey_returns_state_without_timestamp(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="fresh_question",
        question_text="fresh?",
        answer_type="text",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=tmpl.question_id,
        last_answer_value="y",
        last_answered_at=None,
        last_answered_by_user_id=user.user_id,
    )
    async_db_session.add(state)
    await async_db_session.commit()

    result = await surveys_router.get_pending_survey(
        disaster_id=disaster.disaster_id,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert result is not None
    assert result.question_id == tmpl.question_id


@pytest.mark.asyncio
async def test_submit_answer_updates_existing_state_and_injuries(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="injuries_seen",
        question_text="injuries?",
        answer_type="integer",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=tmpl.question_id,
        last_answer_value="1",
        last_answered_at=None,
        last_answered_by_user_id=user.user_id,
    )
    async_db_session.add(state)
    await async_db_session.commit()

    payload = SurveyAnswerRequest(disaster_id=disaster.disaster_id, answer_value=3)
    response = await surveys_router.submit_answer(
        question_id=tmpl.question_id,
        payload=payload,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert response.log_id is not None
    await async_db_session.refresh(state)
    assert state.last_answer_value == "3"


@pytest.mark.asyncio
async def test_get_pending_survey_respects_cooldown(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="cooldown",
        question_text="cooldown?",
        answer_type="text",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=tmpl.question_id,
        last_answer_value="yes",
        last_answered_at=datetime.utcnow(),
        last_answered_by_user_id=user.user_id,
    )
    async_db_session.add(state)
    await async_db_session.commit()

    result = await surveys_router.get_pending_survey(
        disaster_id=disaster.disaster_id,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert result is None


@pytest.mark.asyncio
async def test_submit_answer_returns_404_when_missing(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    payload = SurveyAnswerRequest(disaster_id=disaster.disaster_id, answer_value="x")
    with pytest.raises(Exception) as exc:
        await surveys_router.submit_answer(
            question_id=uuid4(),
            payload=payload,
            current_user=_civilian_stub(user.user_id),
            db=async_db_session,
        )
    assert "404" in str(exc.value)


@pytest.mark.asyncio
async def test_get_pending_survey_respects_cooldown_threshold(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="cooldown2",
        question_text="cooldown?",
        answer_type="text",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    state = DisasterQuestionState(
        disaster_id=disaster.disaster_id,
        question_id=tmpl.question_id,
        last_answer_value="yes",
        last_answered_at=datetime.utcnow() - timedelta(hours=2),
        last_answered_by_user_id=user.user_id,
    )
    async_db_session.add(state)
    await async_db_session.commit()

    result = await surveys_router.get_pending_survey(
        disaster_id=disaster.disaster_id,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert result is not None


@pytest.mark.asyncio
async def test_submit_answer_handles_non_numeric_conversion(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="deaths_seen",
        question_text="How many?",
        answer_type="text",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    payload = SurveyAnswerRequest(disaster_id=disaster.disaster_id, answer_value="not-a-number")
    log_id = await surveys_router.submit_answer(
        question_id=tmpl.question_id,
        payload=payload,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert log_id.log_id is not None


@pytest.mark.asyncio
async def test_submit_answer_handles_non_numeric_injuries(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user()
    disaster = await async_create_disaster()

    tmpl = QuestionTemplate(
        key="injuries_seen",
        question_text="How many injuries?",
        answer_type="text",
        is_active=True,
    )
    async_db_session.add(tmpl)
    await async_db_session.commit()

    payload = SurveyAnswerRequest(disaster_id=disaster.disaster_id, answer_value="unknown")
    log_id = await surveys_router.submit_answer(
        question_id=tmpl.question_id,
        payload=payload,
        current_user=_civilian_stub(user.user_id),
        db=async_db_session,
    )
    assert log_id.log_id is not None
