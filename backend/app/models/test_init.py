from __future__ import annotations

import logging

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import AsyncSessionLocal
from .disaster_management import Disaster, DisasterTask, DisasterTaskAssignment
from .responder_management import ResponderProfile, Team
from .user_family_models import Role, User, UserProfile

logger = logging.getLogger(__name__)

TARGET_EMAIL = "parshvj2005@gmail.com"
TARGET_TEAM_NAME = "Test Logistics Team"
TARGET_DISASTER_TITLE = "Test Disaster"
TARGET_TASK_TYPE = "logistics_support"


async def _get_or_create_responder_role(session: AsyncSession) -> Role:
    """Ensure the responder role exists so the test user can be associated with it."""
    role = await session.scalar(select(Role).where(Role.name == "responder"))
    if role:
        return role

    role = Role(role_id=2, name="responder", description="Temporary responder role for tests")
    session.add(role)
    await session.flush()
    return role


async def _get_or_create_user(session: AsyncSession, role_id: int) -> User:
    """Create or fetch the responder user."""
    user = await session.scalar(select(User).where(User.email == TARGET_EMAIL))
    if user:
        return user

    user = User(role_id=role_id, email=TARGET_EMAIL, is_active=True)
    session.add(user)
    await session.flush()
    await session.refresh(user)

    # Give the user a minimal profile so downstream queries have data to work with.
    if not await session.get(UserProfile, user.user_id):
        session.add(UserProfile(user_id=user.user_id, full_name="Test Responder"))

    return user


async def _get_or_create_team(session: AsyncSession, commander_id) -> Team:
    """Create or fetch a team and make the responder its logistician."""
    team = await session.scalar(select(Team).where(Team.name == TARGET_TEAM_NAME))
    if team:
        return team

    team = Team(
        name=TARGET_TEAM_NAME,
        team_type="disaster_response",
        commander_user_id=commander_id,
        status="available",
    )
    session.add(team)
    await session.flush()
    await session.refresh(team)
    return team


async def _ensure_responder_profile(
    session: AsyncSession, user_id, team_id
) -> ResponderProfile:
    """Attach the responder to the team as its logistician."""
    profile = await session.get(ResponderProfile, user_id)
    if profile:
        profile.team_id = team_id
        profile.responder_type = "logistician"
        return profile

    profile = ResponderProfile(
        user_id=user_id,
        team_id=team_id,
        responder_type="logistician",
        created_by_commander_id=user_id,
        team_joined_at=func.now(),
    )
    session.add(profile)
    return profile


async def _get_or_create_disaster(session: AsyncSession, commander_id) -> Disaster:
    """Create or fetch a disaster record and attach the team through tasks."""
    disaster = await session.scalar(select(Disaster).where(Disaster.title == TARGET_DISASTER_TITLE))
    if disaster:
        return disaster

    disaster = Disaster(
        reported_by_user_id=commander_id,
        commander_user_id=commander_id,
        title=TARGET_DISASTER_TITLE,
        description="Seeded disaster for local testing",
        disaster_type="logistics",
        severity_level="low",
        location=WKTElement("POINT(0 0)", srid=4326),
        affected_area=WKTElement(
            "POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))",
            srid=4326,
        ),
    )
    session.add(disaster)
    await session.flush()
    await session.refresh(disaster)
    return disaster


async def _get_or_create_task(
    session: AsyncSession, disaster_id, creator_id
) -> DisasterTask:
    """Create or fetch a disaster task for the seeded disaster."""
    task = await session.scalar(
        select(DisasterTask).where(
            DisasterTask.disaster_id == disaster_id,
            DisasterTask.task_type == TARGET_TASK_TYPE,
        )
    )
    if task:
        return task

    task = DisasterTask(
        disaster_id=disaster_id,
        created_by_commander_id=creator_id,
        task_type=TARGET_TASK_TYPE,
        description="Seeded task for testing team assignment",
        priority="medium",
    )
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task


async def _assign_team_to_task(
    session: AsyncSession, task_id, team_id, assigner_id
) -> None:
    """Ensure the seeded team is attached to the seeded task."""
    assignment = await session.get(DisasterTaskAssignment, (task_id, team_id))
    if assignment:
        assignment.assigned_by_user_id = assigner_id
        return

    assignment = DisasterTaskAssignment(
        task_id=task_id,
        team_id=team_id,
        assigned_by_user_id=assigner_id,
        status="assigned",
    )
    session.add(assignment)


async def seed_test_data() -> None:
    """
    Seed a responder, team, disaster, and task for quick local testing.

    The routine is idempotent to keep imports safe even if it runs repeatedly.
    """
    async with AsyncSessionLocal() as session:
        try:
            responder_role = await _get_or_create_responder_role(session)
            user = await _get_or_create_user(session, responder_role.role_id)
            team = await _get_or_create_team(session, user.user_id)
            await _ensure_responder_profile(session, user.user_id, team.team_id)
            disaster = await _get_or_create_disaster(session, user.user_id)
            task = await _get_or_create_task(session, disaster.disaster_id, user.user_id)
            await _assign_team_to_task(session, task.task_id, team.team_id, user.user_id)
            await session.commit()
        except SQLAlchemyError as exc:  # pragma: no cover - diagnostics only
            await session.rollback()
            logger.error("Failed to seed test data: %s", exc)
        except Exception as exc:  # pragma: no cover - diagnostics only
            await session.rollback()
            logger.error("Unexpected error while seeding test data: %s", exc)
