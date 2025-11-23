from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, func, literal_column
from sqlalchemy.orm import aliased, selectinload
from uuid import UUID
from geoalchemy2.functions import ST_X, ST_Y

from app.models.responder_models import Team, ResponderProfile
from app.models.user_family_models import User, UserProfile

class ResponderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_team(self, data: dict) -> Team:
        new_team = Team(**data)
        self.db.add(new_team)
        await self.db.commit()
        await self.db.refresh(new_team)
        return new_team

    async def get_teams_with_location(self, status_filter: str = None, type_filter: str = None):
        """
        Fetches teams, counts members, and derives location from the Team Commander.
        """
        # Query construction
        # Note: ST_Y is Latitude, ST_X is Longitude
        query = (
            select(
                Team,
                func.count(ResponderProfile.user_id).label("member_count"),
                ST_Y(User.last_known_location).label("lat"),
                ST_X(User.last_known_location).label("lon")
            )
            .outerjoin(ResponderProfile, Team.team_id == ResponderProfile.team_id)
            .outerjoin(User, Team.commander_user_id == User.user_id)
            .group_by(Team.team_id, User.last_known_location)
        )

        if status_filter:
            query = query.where(Team.status == status_filter)
        if type_filter:
            query = query.where(Team.team_type == type_filter)

        result = await self.db.execute(query)
        rows = result.all()
        
        # Map to structure for Pydantic
        teams = []
        for team, count, lat, lon in rows:
            # We attach the calculated fields to the object wrapper or return a dict
            # Using a wrapper method is cleaner for Pydantic "from_attributes"
            team_data = team.__dict__.copy()
            team_data['member_count'] = count
            team_data['current_latitude'] = lat
            team_data['current_longitude'] = lon
            teams.append(team_data)
        
        return teams

    async def create_responder(self, data: dict) -> dict:
        """
        Atomic creation of User, UserProfile, and ResponderProfile.
        """
        # 1. Insert User (Ghost User)
        # Role ID 2 = Responder
        new_user = User(
            email=data['email'], 
            role_id=2, 
            phone_number=data.get('phone_number'),
            is_active=True
        )
        self.db.add(new_user)
        await self.db.flush() # Generate UUID

        # 2. Insert User Profile
        new_profile = UserProfile(
            user_id=new_user.user_id,
            full_name=data['full_name']
        )
        self.db.add(new_profile)

        # 3. Insert Responder Profile
        resp_profile = ResponderProfile(
            user_id=new_user.user_id,
            responder_type=data['responder_type'],
            badge_number=data['badge_number'],
            government_id_number=data.get('government_id_number'),
            team_id=data.get('team_id'),
            status='active'
        )
        self.db.add(resp_profile)

        await self.db.commit()
        
        # Return a composite dict for response
        return {
            "user_id": new_user.user_id,
            "full_name": new_profile.full_name,
            "email": new_user.email,
            "responder_type": resp_profile.responder_type,
            "badge_number": resp_profile.badge_number,
            "team_name": None, # Can be fetched if team_id provided
            "status": resp_profile.status,
            "last_known_latitude": None,
            "last_known_longitude": None
        }

    async def get_all_responders(self, filters: dict):
        """
        Joins User -> Profile -> ResponderProfile -> Team
        """
        query = (
            select(
                User.user_id,
                User.email,
                UserProfile.full_name,
                ResponderProfile.responder_type,
                ResponderProfile.badge_number,
                ResponderProfile.status,
                Team.name.label("team_name"),
                ST_Y(User.last_known_location).label("lat"),
                ST_X(User.last_known_location).label("lon")
            )
            .join(UserProfile, User.user_id == UserProfile.user_id)
            .join(ResponderProfile, User.user_id == ResponderProfile.user_id)
            .outerjoin(Team, ResponderProfile.team_id == Team.team_id)
        )

        if filters.get('team_id'):
            query = query.where(ResponderProfile.team_id == filters['team_id'])
        if filters.get('responder_type'):
            query = query.where(ResponderProfile.responder_type == filters['responder_type'])
        if filters.get('status'):
            query = query.where(ResponderProfile.status == filters['status'])

        result = await self.db.execute(query)
        rows = result.all()

        responders = []
        for row in rows:
            responders.append({
                "user_id": row.user_id,
                "full_name": row.full_name,
                "email": row.email,
                "responder_type": row.responder_type,
                "badge_number": row.badge_number,
                "team_name": row.team_name,
                "status": row.status,
                "last_known_latitude": row.lat,
                "last_known_longitude": row.lon
            })
        return responders

    async def update_responder(self, user_id: UUID, data: dict):
        """
        Updates ResponderProfile. Handles team joining logic.
        """
        # Clean data - allow team_id to be None (for removing from team)
        updates = {k: v for k, v in data.items() if k == 'team_id' or v is not None}
        
        if not updates:
            return

        stmt = update(ResponderProfile).where(ResponderProfile.user_id == user_id)
        
        if 'team_id' in updates:
            # Add timestamp logic for team join, or clear it when removing
            if updates['team_id'] is not None:
                stmt = stmt.values(team_joined_at=func.now())
            else:
                stmt = stmt.values(team_joined_at=None)
        
        stmt = stmt.values(**updates)
        
        await self.db.execute(stmt)
        await self.db.commit()

        # Fetch updated for return (simplified for now)
        return await self.get_responder_detail(user_id)

    async def get_responder_detail(self, user_id: UUID):
        # Helper to fetch single responder details for response
        query = (
             select(
                User.user_id,
                User.email,
                UserProfile.full_name,
                ResponderProfile.responder_type,
                ResponderProfile.badge_number,
                ResponderProfile.status,
                Team.name.label("team_name"),
                ST_Y(User.last_known_location).label("lat"),
                ST_X(User.last_known_location).label("lon")
            )
            .join(UserProfile, User.user_id == UserProfile.user_id)
            .join(ResponderProfile, User.user_id == ResponderProfile.user_id)
            .outerjoin(Team, ResponderProfile.team_id == Team.team_id)
            .where(User.user_id == user_id)
        )
        result = await self.db.execute(query)
        row = result.first()
        if row:
            return {
                "user_id": row.user_id,
                "full_name": row.full_name,
                "email": row.email,
                "responder_type": row.responder_type,
                "badge_number": row.badge_number,
                "team_name": row.team_name,
                "status": row.status,
                "last_known_latitude": row.lat,
                "last_known_longitude": row.lon
            }
        return None