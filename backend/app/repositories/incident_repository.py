from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, and_, insert
from sqlalchemy.orm import selectinload
from geoalchemy2 import Geography
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from datetime import datetime, timedelta
from uuid import UUID

# --- IMPORTS FROM YOUR SPECIFIC FILES ---
from app.models.disaster_management import Incident, Disaster
from app.models.questionnaires_and_logs import IncidentMedia, DisasterLog, DisasterFollower
from app.models.user_family_models import User # Needed for spatial query on User table

# Provide a convenient alias expected by routers
Incident.media = Incident.media_items

class IncidentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_duplicate_incident(
        self, 
        lat: float, 
        lon: float, 
        incident_type: str,
        time_window_minutes: int = 60,
        radius_meters: int = 100
    ) -> Incident | None:
        """
        De-duplication: Finds existing open incidents within 100m and 1 hour.
        """
        point = WKTElement(f'POINT({lon} {lat})', srid=4326)
        time_threshold = datetime.utcnow() - timedelta(minutes=time_window_minutes)

        query = select(Incident).where(
            and_(
                Incident.status == 'open',
                Incident.incident_type == incident_type,
                Incident.reported_at >= time_threshold,
                func.ST_DWithin(
                    cast(Incident.location, Geography),
                    cast(point, Geography),
                    radius_meters
                )
            )
        ).order_by(Incident.reported_at.desc())

        # Eager load media to ensure response format is correct
        query = query.options(selectinload(Incident.media))

        result = await self.db.execute(query)
        return result.scalars().first()

    async def create_incident(
        self, 
        user_id: UUID, 
        data: object, # IncidentCreateRequest
        is_sos: bool = False
    ) -> Incident:
        
        title = data.title if data.title else ("SOS: Emergency Alert" if is_sos else "Untitled Incident")
        inc_type = data.incident_type if data.incident_type else ("sos" if is_sos else "other")
        desc = data.description if data.description else ("One-tap SOS trigger" if is_sos else None)
        point = WKTElement(f'POINT({data.longitude} {data.latitude})', srid=4326)

        new_incident = Incident(
            reported_by_user_id=user_id,
            title=title,
            description=desc,
            incident_type=inc_type,
            location=point,
            status='open'
        )
        self.db.add(new_incident)
        await self.db.flush()  # Flush to get ID before commit
        await self.db.commit()
        await self.db.refresh(new_incident, ['media_items'])  # Refresh with relationships
        return new_incident

    async def get_all_open_incidents(self) -> list[Incident]:
        query = select(Incident).options(selectinload(Incident.media)).where(Incident.status == 'open')
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_incidents_for_user(self, user_id: UUID) -> list[Incident]:
        query = (
            select(Incident)
            .options(selectinload(Incident.media))
            .where(Incident.reported_by_user_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_incident(self, incident_id: UUID) -> Incident | None:
        query = select(Incident).options(selectinload(Incident.media)).where(Incident.incident_id == incident_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def add_media(self, incident_id: UUID, user_id: UUID, file_meta: dict) -> IncidentMedia:
        media = IncidentMedia(
            incident_id=incident_id,
            uploaded_by_user_id=user_id,
            file_type=file_meta['file_type'],
            mime_type=file_meta['mime_type'],
            storage_path=file_meta['storage_path']
        )
        self.db.add(media)
        await self.db.commit()
        await self.db.refresh(media)
        return media
    
    async def discard_incident(self, incident_id: UUID):
        incident = await self.db.get(Incident, incident_id)
        if incident:
            incident.status = 'discarded'
            await self.db.commit()
        return incident

    # --- THE NEW CONVERSION LOGIC ---
    async def convert_to_disaster(self, incident_id: UUID, severity: str, disaster_type: str = None):
        """
        Converts Incident -> Disaster.
        1. Update Incident Status.
        2. Create Disaster.
        3. Create Initialization Log.
        4. Link Followers (10km radius).
        """
        # 1. Fetch Incident
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        
        if incident.status == 'converted':
            # Already converted, return existing disaster if we had a link, or just True
            return True

        # 2. Update Incident Status
        incident.status = 'converted'

        # 3. Create Disaster
        # Defaulting severity/type if not provided
        final_type = disaster_type if disaster_type else (incident.incident_type or 'other')
        
        new_disaster = Disaster(
            source_incident_id=incident.incident_id,
            reported_by_user_id=incident.reported_by_user_id,
            title=incident.title,
            description=incident.description,
            location=incident.location,
            status='active',
            disaster_type=final_type,
            severity_level=severity
        )
        self.db.add(new_disaster)
        await self.db.flush() # Generate disaster_id

        # 4. Create Initialization Log
        # This preserves the history for the LLM/Commanders
        init_log = DisasterLog(
            disaster_id=new_disaster.disaster_id,
            source_type='system', # Or 'initialization'
            title="Disaster Declared",
            text_body=f"Disaster initialized from Incident: {incident.title}. \nOriginal Description: {incident.description}",
            created_at=datetime.utcnow()
        )
        self.db.add(init_log)

        # 5. The 10km Logic (Mass Follower Subscription)
        # Find all users within 10,000 meters of the incident location
        radius_meters = 10000

        incident_shape = to_shape(incident.location)
        incident_wkt = f"SRID=4326;{incident_shape.wkt}"
        
        # We use a subquery to select the User IDs
        users_in_range_subquery = select(User.user_id).where(
            func.ST_DWithin(
                cast(User.last_known_location, Geography),
                func.ST_GeogFromText(incident_wkt),
                radius_meters
            )
        )

        # Fetch IDs first (safer for pure SQLAlchemy Async)
        result = await self.db.execute(users_in_range_subquery)
        user_ids = result.scalars().all()
        
        if user_ids:
            followers = [
                DisasterFollower(disaster_id=new_disaster.disaster_id, user_id=uid)
                for uid in user_ids
            ]
            self.db.add_all(followers)

        await self.db.commit()
        
        return new_disaster

    async def delete_incident(self, incident_id: UUID):
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        await self.db.execute(Incident.__table__.delete().where(Incident.incident_id == incident_id))
        await self.db.commit()
        return True

    async def update_incident(self, incident_id: UUID, data: dict):
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        clean = {k: v for k, v in data.items() if v is not None}
        if not clean:
            return incident
        await self.db.execute(
            Incident.__table__.update().where(Incident.incident_id == incident_id).values(**clean)
        )
        await self.db.commit()
        await self.db.refresh(incident)
        return incident
