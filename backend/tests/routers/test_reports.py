import pytest
from types import SimpleNamespace
from uuid import uuid4

from app.models.draft_reports import DisasterReportDraft
from app.routers import reports as reports_router
from app.schemas.reports import ReportUpdateRequest


def _commander_stub(user_id):
    return SimpleNamespace(user_id=user_id, role=SimpleNamespace(name="commander"))


@pytest.mark.asyncio
async def test_generate_report_draft(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(email="commander@example.com", role_name="commander")
    disaster = await async_create_disaster()

    result = await reports_router.generate_report_draft(
        disaster.disaster_id,
        current_user=_commander_stub(user.user_id),
        db=async_db_session,
    )

    assert result.status == "draft"
    assert result.version_number == 1
    assert result.estimated_deaths == 12


@pytest.mark.asyncio
async def test_list_reports(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(role_name="commander")
    disaster = await async_create_disaster()

    draft = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        version_number=1,
        status="draft",
    )
    async_db_session.add(draft)
    await async_db_session.commit()

    reports = await reports_router.list_reports(
        disaster.disaster_id,
        current_user=_commander_stub(user.user_id),
        db=async_db_session,
    )
    assert len(reports) == 1
    assert reports[0].report_id == draft.report_id


@pytest.mark.asyncio
async def test_update_report(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(role_name="commander")
    disaster = await async_create_disaster()

    draft = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        version_number=1,
        status="draft",
        estimated_deaths=10,
    )
    async_db_session.add(draft)
    await async_db_session.commit()

    updated = await reports_router.update_report(
        draft.report_id,
        payload=ReportUpdateRequest(estimated_deaths=20),
        current_user=_commander_stub(user.user_id),
        db=async_db_session,
    )
    assert updated.estimated_deaths == 20


@pytest.mark.asyncio
async def test_export_pdf(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(role_name="commander")
    disaster = await async_create_disaster()

    draft = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        version_number=1,
        status="draft",
    )
    async_db_session.add(draft)
    await async_db_session.commit()

    response = await reports_router.export_pdf(
        draft.report_id,
        current_user=_commander_stub(user.user_id),
        db=async_db_session,
    )
    assert response.status_code == 200
    await async_db_session.refresh(draft)
    assert draft.status == "final"


@pytest.mark.asyncio
async def test_get_report_returns_404_for_missing(async_db_session, async_create_user):
    user = await async_create_user(role_name="commander")
    with pytest.raises(Exception) as exc:
        await reports_router.get_report(
            report_id=uuid4(),
            current_user=_commander_stub(user.user_id),
            db=async_db_session,
        )
    assert "404" in str(exc.value)


@pytest.mark.asyncio
async def test_update_report_returns_404_for_missing(async_db_session, async_create_user):
    user = await async_create_user(role_name="commander")
    with pytest.raises(Exception) as exc:
        await reports_router.update_report(
            report_id=uuid4(),
            payload=ReportUpdateRequest(status="draft"),
            current_user=_commander_stub(user.user_id),
            db=async_db_session,
        )
    assert "404" in str(exc.value)


@pytest.mark.asyncio
async def test_export_pdf_returns_404_for_missing(async_db_session, async_create_user):
    user = await async_create_user(role_name="commander")
    with pytest.raises(Exception) as exc:
        await reports_router.export_pdf(
            report_id=uuid4(),
            current_user=_commander_stub(user.user_id),
            db=async_db_session,
        )
    assert "404" in str(exc.value)


@pytest.mark.asyncio
async def test_delete_report_removes_record(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(role_name="commander")
    disaster = await async_create_disaster()
    draft = DisasterReportDraft(
        disaster_id=disaster.disaster_id,
        created_by_user_id=user.user_id,
        version_number=1,
        status="draft",
    )
    async_db_session.add(draft)
    await async_db_session.commit()

    response = await reports_router.delete_report(
        draft.report_id,
        current_user=_commander_stub(user.user_id),
        db=async_db_session,
    )
    assert response["message"] == "Report deleted"
    assert await async_db_session.get(DisasterReportDraft, draft.report_id) is None


@pytest.mark.asyncio
async def test_delete_report_returns_404_for_missing(async_db_session, async_create_user):
    user = await async_create_user(role_name="commander")
    with pytest.raises(Exception) as exc:
        await reports_router.delete_report(
            report_id=uuid4(),
            current_user=_commander_stub(user.user_id),
            db=async_db_session,
        )
    assert "404" in str(exc.value)
