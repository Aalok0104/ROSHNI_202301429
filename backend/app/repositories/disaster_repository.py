from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, and_, insert, delete
from sqlalchemy.orm import selectinload
from geoalchemy2 import Geography, Geometry
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from uuid import UUID
from datetime import datetime

# Imports
from app.models.disaster_management import Incident, Disaster
from app.models.questionnaires_and_logs import DisasterLog, DisasterFollower
from app.models.user_family_models import User
from app.models.responder_models import Team, ResponderProfile
from app.models.mapping_and_tracking import MapSite

class DisasterRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Helper: GeoJSON Converter ---
    def _to_geojson(self, location, properties: dict) -> dict:
        if not location:
            return None
        try:
            shape = to_shape(location)
            return {
                "type": "Feature",
                "geometry": mapping(shape),
                "properties": properties
            }
        except Exception:
            return None

    # --- A. Conversion Logic ---
    async def convert_incident(self, incident_id: UUID, data: dict) -> Disaster:
        # 1. Fetch Incident
        incident = await self.db.get(Incident, incident_id)
        if not incident or incident.status == 'converted':
            return None

        # 2. Update Incident Status (Logical Deletion from Incident Feed)
        incident.status = 'converted'

        # 3. Create Disaster
        new_disaster = Disaster(
            source_incident_id=incident.incident_id,
            reported_by_user_id=incident.reported_by_user_id,
            title=incident.title,
            description=incident.description,
            location=incident.location,
            status='active',
            disaster_type=data.get('disaster_type') or incident.incident_type or 'other',
            severity_level=data['severity_level']
        )
        self.db.add(new_disaster)
        await self.db.flush() # Get ID

        # 4. Create Initialization Log (Preserve History)
        init_log = DisasterLog(
            disaster_id=new_disaster.disaster_id,
            source_type='system',
            title="Disaster Declared",
            text_body=f"Converted from Incident {incident.title}. Origin description: {incident.description}",
            created_at=datetime.utcnow()
        )
        self.db.add(init_log)

        # 5. Spatial Trigger: Subscribe Users within Radius
        radius = data['radius_meters']

        incident_shape = to_shape(incident.location)
        incident_wkt = f"SRID=4326;{incident_shape.wkt}"
        
        # Select users using PostGIS Geography cast (Meters)
        stmt = select(User.user_id).where(
            func.ST_DWithin(
                cast(User.last_known_location, Geography),
                func.ST_GeogFromText(incident_wkt),
                radius
            )
        )
        result = await self.db.execute(stmt)
        user_ids = result.scalars().all()

        if user_ids:
            followers = [
                DisasterFollower(disaster_id=new_disaster.disaster_id, user_id=uid)
                for uid in user_ids
            ]
            self.db.add_all(followers)

        await self.db.commit()
        await self.db.refresh(new_disaster)
        return new_disaster

    # --- B. Dashboard List ---
    async def get_disasters(self, user_id: UUID, role_name: str):
        if role_name == 'commander':
            # Commanders see all active
            query = select(Disaster).where(
                Disaster.status.in_(['active', 'ongoing', 'contained', 'critical'])
            )
        else:
            # Civilians/Responders see only what they follow
            query = (
                select(Disaster)
                .join(DisasterFollower, Disaster.disaster_id == DisasterFollower.disaster_id)
                .where(DisasterFollower.user_id == user_id)
            )
        
        result = await self.db.execute(query)
        return result.scalars().all()

    # --- C. Stats ---
    async def get_stats(self, disaster_id: UUID) -> dict:
        # 1. Aggregate Logs (Summing additive reports)
        stats_query = select(
            func.coalesce(func.sum(DisasterLog.num_deaths), 0),
            func.coalesce(func.sum(DisasterLog.num_injuries), 0),
            func.coalesce(func.sum(DisasterLog.estimated_resource_cost), 0)
        ).where(DisasterLog.disaster_id == disaster_id)
        
        stats_res = await self.db.execute(stats_query)
        deaths, injuries, cost = stats_res.one()

        # 2. Count Followers
        followers_query = select(func.count(DisasterFollower.user_id)).where(
            DisasterFollower.disaster_id == disaster_id
        )
        followers_res = await self.db.execute(followers_query)
        pop_count = followers_res.scalar()

        return {
            "total_deaths": deaths,
            "total_injured": injuries,
            "resources_cost_estimate": float(cost),
            "affected_population_count": pop_count,
            "personnel_deployed": 0 # Placeholder
        }

    # --- D. Map Data ---
    async def get_map_data(self, disaster_id: UUID, include_teams: bool = False) -> dict:
        # 1. Disaster Point
        disaster = await self.db.get(Disaster, disaster_id)
        if not disaster:
            return None
        
        disaster_feat = self._to_geojson(
            disaster.location, 
            {"name": disaster.title, "status": disaster.status}
        )

        disaster_shape = to_shape(disaster.location)
        disaster_wkt = f"SRID=4326;{disaster_shape.wkt}"

        # 2. Critical Infrastructure (Within 15km)
        sites_query = select(MapSite).where(
            func.ST_DWithin(
                cast(MapSite.location, Geography),
                func.ST_GeogFromText(disaster_wkt),
                15000
            )
        )
        sites_res = await self.db.execute(sites_query)
        sites_feats = [
            self._to_geojson(s.location, {"name": s.name, "type": s.site_type})
            for s in sites_res.scalars().all()
        ]

        # 3. Teams (If allowed)
        teams_feats = []
        if include_teams:
            # Join Teams with Commander User to get location
            teams_query = (
                select(Team, User.last_known_location)
                .join(User, Team.commander_user_id == User.user_id)
                .where(Team.status == 'deployed') # Only show deployed? Or all available.
                # Optional: Spatial filter for teams near disaster
            )
            teams_res = await self.db.execute(teams_query)
            for team, loc in teams_res.all():
                feat = self._to_geojson(loc, {"name": team.name, "type": team.team_type})
                if feat: teams_feats.append(feat)

        return {
            "disaster_location": disaster_feat,
            "affected_area": None, # Could enable if polygon exists
            "critical_infrastructure": sites_feats,
            "active_teams": teams_feats
        }

    async def close_disaster(self, disaster_id: UUID):
        disaster = await self.db.get(Disaster, disaster_id)
        if disaster:
            disaster.status = 'resolved'
            disaster.resolved_at = datetime.utcnow()
            await self.db.commit()
        return disaster
