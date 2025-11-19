from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload
from geoalchemy2.elements import WKTElement
from uuid import UUID
from datetime import datetime

from app.models.disaster_management import DisasterTask, DisasterTaskAssignment
from app.models.responder_models import Team, ResponderProfile
from app.schemas.tasks import TaskCreateRequest

class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_task(self, disaster_id: UUID, commander_id: UUID, data: TaskCreateRequest) -> DisasterTask:
        point = WKTElement(f'POINT({data.longitude} {data.latitude})', srid=4326)
        
        new_task = DisasterTask(
            disaster_id=disaster_id,
            created_by_commander_id=commander_id,
            task_type=data.task_type,
            description=data.description,
            priority=data.priority,
            location=point,
            status='pending'
        )
        self.db.add(new_task)
        await self.db.commit()
        await self.db.refresh(new_task)
        return new_task

    async def get_tasks(self, disaster_id: UUID, filters: dict = None) -> list[DisasterTask]:
        """
        Fetches tasks with nested assignments and team names.
        """
        query = (
            select(DisasterTask)
            .where(DisasterTask.disaster_id == disaster_id)
            .options(
                selectinload(DisasterTask.assignments).selectinload(DisasterTaskAssignment.team)
            )
        )

        if filters and filters.get('status'):
            query = query.where(DisasterTask.status == filters['status'])
        if filters and filters.get('priority'):
            query = query.where(DisasterTask.priority == filters['priority'])
            
        # Logic for "my_team_only" would require joining Assignments in the WHERE clause,
        # implemented in router logic usually or complex join here.
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def assign_team(self, task_id: UUID, team_id: UUID, commander_id: UUID):
        # 1. Check existence
        exists_q = select(DisasterTaskAssignment).where(
            and_(
                DisasterTaskAssignment.task_id == task_id,
                DisasterTaskAssignment.team_id == team_id
            )
        )
        res = await self.db.execute(exists_q)
        if res.scalar():
            raise ValueError("Team already assigned")

        # 2. Create Assignment
        assignment = DisasterTaskAssignment(
            task_id=task_id,
            team_id=team_id,
            assigned_by_user_id=commander_id,
            status='assigned'
        )
        self.db.add(assignment)

        # 3. Side Effect: Update Task Status -> in_progress
        await self.db.execute(
            update(DisasterTask)
            .where(DisasterTask.task_id == task_id)
            .values(status='in_progress')
        )

        # 4. Side Effect: Update Team Status -> deployed
        await self.db.execute(
            update(Team)
            .where(Team.team_id == team_id)
            .values(status='deployed')
        )

        await self.db.commit()

    async def update_assignment_status(self, task_id: UUID, team_id: UUID, status: str, eta: datetime = None):
        # 1. Prepare Updates
        values = {"status": status}
        if status == 'on_scene':
            values['arrived_at'] = func.now()
        elif status == 'completed' or status == 'cancelled':
            values['released_at'] = func.now()
        if eta:
            values['eta'] = eta

        # 2. Execute Update
        await self.db.execute(
            update(DisasterTaskAssignment)
            .where(and_(
                DisasterTaskAssignment.task_id == task_id,
                DisasterTaskAssignment.team_id == team_id
            ))
            .values(**values)
        )

        # 3. Logic: Updating Team Availability
        if status in ['completed', 'cancelled']:
            # Check if team has OTHER active assignments
            active_count_q = select(func.count(DisasterTaskAssignment.task_id)).where(
                and_(
                    DisasterTaskAssignment.team_id == team_id,
                    DisasterTaskAssignment.status.in_(['assigned', 'en_route', 'on_scene'])
                )
            )
            res = await self.db.execute(active_count_q)
            active_count = res.scalar()
            
            if active_count == 0:
                await self.db.execute(
                    update(Team).where(Team.team_id == team_id).values(status='available')
                )

        # 4. Logic: Updating Task Completion
        if status == 'completed':
            # Check if ALL assignments for this task are complete
            pending_q = select(func.count(DisasterTaskAssignment.team_id)).where(
                and_(
                    DisasterTaskAssignment.task_id == task_id,
                    DisasterTaskAssignment.status.notin_(['completed', 'cancelled'])
                )
            )
            res = await self.db.execute(pending_q)
            pending_count = res.scalar()

            if pending_count == 0:
                await self.db.execute(
                    update(DisasterTask).where(DisasterTask.task_id == task_id).values(status='completed')
                )

        await self.db.commit()

    async def get_user_team_id(self, user_id: UUID) -> UUID | None:
        # Helper to verify if a user belongs to a specific team
        q = select(ResponderProfile.team_id).where(ResponderProfile.user_id == user_id)
        res = await self.db.execute(q)
        return res.scalar()

    async def update_task_status(self, task_id: UUID, status: str):
        await self.db.execute(
            update(DisasterTask).where(DisasterTask.task_id == task_id).values(status=status)
        )
        await self.db.commit()