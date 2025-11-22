import pytest
from types import SimpleNamespace

from app.models.questionnaires_and_logs import QuestionTemplate
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
