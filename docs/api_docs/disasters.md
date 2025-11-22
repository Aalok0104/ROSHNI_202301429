Here is the detailed specification for **`app/routers/disasters.py`**.

This is the **Core Logic Engine** of your application. It handles the transition from a simple report to a full-scale managed response, including the critical spatial algorithm that defines who gets alerted.

-----

### **Router Specification: `app/routers/disasters.py`**

**Purpose:** Manage the lifecycle of a disaster, calculating spatial impact, aggregating statistics, and serving map data layers.
**Dependencies:** `GeoAlchemy2` (Crucial for 10km radius), `SQLAlchemy` (Transactions), `BackgroundTasks` (Notifications).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/disasters.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# 1. Request to Convert Incident -> Disaster
class DisasterConversionRequest(BaseModel):
    severity_level: str = Field(..., description="low, medium, high, critical")
    disaster_type: str # flood, earthquake, etc.
    radius_meters: int = 10000 # Default 10km, but Commander can adjust

# 2. Public Disaster Info (Safe for Civilians)
class DisasterPublicResponse(BaseModel):
    disaster_id: UUID
    title: str
    description: Optional[str]
    disaster_type: str
    status: str
    latitude: float
    longitude: float
    severity_level: str

# 3. Internal Statistics (Commander Only)
class DisasterStatsResponse(BaseModel):
    total_deaths: int
    total_injured: int
    personnel_deployed: int
    resources_cost_estimate: float
    affected_population_count: int # How many people following

# 4. Map Data (GeoJSON Format for Frontend Leaflet/Mapbox)
class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any] # Point or Polygon
    properties: Dict[str, Any]

class DisasterMapResponse(BaseModel):
    disaster_location: GeoJSONFeature
    affected_area: Optional[GeoJSONFeature]
    # List of sites (Hospitals, Safe Zones)
    critical_infrastructure: List[GeoJSONFeature] 
    # List of active Teams in the area
    active_teams: List[GeoJSONFeature] 
```

-----

### **2. Endpoints**

#### **A. `POST /incidents/{incident_id}/convert`**

  * **Purpose:** **The "Big Red Button".** Elevates a report to a disaster and triggers mass alerts.
  * **Role:** Commander Only.
  * **Input:** `DisasterConversionRequest`.
  * **Logic (Transaction Required):**
    1.  **Lock & Verify:** Fetch the incident. Ensure it's not already converted.
    2.  **Update Incident:** Set `incidents.status` = 'converted'.
    3.  **Create Disaster:**
          * Insert into `disasters`.
          * Copy `location`, `title`, `description` from Incident.
          * Set `severity_level`, `disaster_type`.
    4.  **The Spatial Trigger (10km Logic):**
          * Execute a raw SQL or GeoAlchemy query to find users.
          * *Query Logic:* `SELECT user_id FROM users WHERE ST_DWithin(last_known_location::geography, :disaster_point::geography, :radius)`.
          * **Note:** Use `::geography` casting to calculate distance in **meters**. If you use `::geometry` on SRID 4326, it calculates in degrees (wrong).
    5.  **Bulk Insert:** Insert all found `user_id`s into `disaster_followers`.
    6.  **Commit.**
    7.  **Background Task:** Send Push Notifications to those users: *"Emergency Alert: You are in a disaster zone."*
  * **Returns:** `DisasterPublicResponse` (with the new `disaster_id`).

#### **B. `GET /disasters`**

  * **Purpose:** The main dashboard list.
  * **Role:** Mixed.
  * **Logic:**
      * **If Commander:** Query `SELECT * FROM disasters WHERE status IN ('active', 'ongoing')`.
      * **If Civilian:** Query `disasters` JOIN `disaster_followers`. Only show disasters the user is currently following.
  * **Returns:** List of `DisasterPublicResponse`.

#### **C. `GET /disasters/{disaster_id}/stats`**

  * **Purpose:** Operational awareness.
  * **Role:** Commander Only.
  * **Logic:**
      * Aggregate data from **`disaster_logs`** (Log entries from reporters/sensors).
      * `SUM(num_deaths)`, `SUM(num_injuries)`, `SUM(estimated_damage_cost)`.
      * Count `disaster_followers` for "Affected Population".
  * **Returns:** `DisasterStatsResponse`.

#### **D. `GET /disasters/{disaster_id}/map`**

  * **Purpose:** Provides the layers for the Map UI.
  * **Role:** Commander (Full access), Civilian (Restricted - maybe hide Teams).
  * **Logic:**
    1.  **Disaster Point:** Create GeoJSON Point.
    2.  **Infrastructure:** Query `map_sites` where `ST_DWithin(location, disaster_location, 15000)`. Convert to GeoJSON.
    3.  **Teams:**
          * Query `teams` joined with Leader's `last_known_location`.
          * Filter those assigned to tasks in this disaster OR generically near the location.
          * Convert to GeoJSON.
  * **Returns:** `DisasterMapResponse`.

#### **E. `PATCH /disasters/{disaster_id}/close`**

  * **Purpose:** End the operation.
  * **Role:** Commander.
  * **Logic:** Set status to `resolved` and `resolved_at` to `NOW()`.

-----

### **3. Critical Implementation Details**

#### **1. The "Geography" Cast (PostGIS)**

This is the most common mistake in geospatial apps. Your coder **must** use geography for distance checks.

**SQLAlchemy / GeoAlchemy2 Implementation:**

```python
from geoalchemy2 import Geography
from sqlalchemy import func, cast

# In the conversion endpoint:
radius = 10000 # meters
# Cast the geometry column to geography to use meters
subquery = select(User.user_id).where(
    func.ST_DWithin(
        cast(User.last_known_location, Geography),
        cast(incident.location, Geography),
        radius
    )
)
# Then perform the bulk insert using this subquery
```

#### **2. Aggregating Logs for Stats**

The `disaster_logs` table is an immutable stream of updates. You shouldn't just take the *latest* log; you have to decide how to aggregate.

  * *Strategy:* Usually, logs are additive (e.g., "Found 2 more injured").
  * *Alternative:* If logs are snapshots (e.g., "Total injured is now 50"), you need the latest log per category.
  * *Recommendation:* Treat logs as "Reports". For the stats endpoint, strictly sum specific numeric fields if they represent *new* findings, OR use the `DisasterReportDraft` (generated by LLM later) for the "official" count. For now, a simple `SUM` is risky.
  * *Refined Logic:* Let's assume `disaster_logs` are **incremental reports** ("Found 2 bodies"). Then `SUM` works. If they are updates, fetch the *latest* log entry that contains stats.

#### **3. Map Data & Leaflet/Mapbox**

The frontend expects **GeoJSON**. Do not send raw WKT (Well-Known Text) like `POINT(30 70)`.
Use a helper function in Python:

```python
import json
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

def to_geojson(db_model_instance):
    # Convert DB element to Shapely shape
    shply_geom = to_shape(db_model_instance.location)
    # Convert Shapely to GeoJSON dict
    return {
        "type": "Feature",
        "geometry": mapping(shply_geom),
        "properties": {
            "name": db_model_instance.name,
            "type": db_model_instance.site_type
        }
    }
```

### **Next Step**

We have the disaster running. Now we need to manage the people working on it.
Shall we proceed to **`tasks.py`** (Assigning teams to jobs) or **`chat.py`** (Real-time comms)? `tasks.py` is logically the next operational step.