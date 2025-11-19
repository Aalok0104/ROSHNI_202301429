from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# --- 1. Conversion Request ---
class DisasterConversionRequest(BaseModel):
    severity_level: str = Field(..., description="low, medium, high, critical")
    disaster_type: Optional[str] = None # If None, inherits from Incident
    radius_meters: int = 10000 # Default 10km

# --- 2. Public Response ---
class DisasterPublicResponse(BaseModel):
    disaster_id: UUID
    title: str
    description: Optional[str]
    disaster_type: Optional[str]
    status: str
    latitude: float
    longitude: float
    severity_level: Optional[str]
    affected_area_geojson: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# --- 3. Statistics (Commander) ---
class DisasterStatsResponse(BaseModel):
    total_deaths: int
    total_injured: int
    personnel_deployed: int = 0 # Placeholder for Phase 5 (Teams)
    resources_cost_estimate: float
    affected_population_count: int

# --- 4. Map Data (GeoJSON) ---
class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any] # The Point or Polygon dict
    properties: Dict[str, Any]

class DisasterMapResponse(BaseModel):
    disaster_location: GeoJSONFeature
    affected_area: Optional[GeoJSONFeature] = None
    critical_infrastructure: List[GeoJSONFeature] = []
    active_teams: List[GeoJSONFeature] = []