### **Router Specification: `app/routers/incidents.py`**

**Purpose:** Handle standard incident reporting, high-priority SOS signals, and media attachment.
**Dependencies:** `GeoAlchemy2`, `UploadFile` (FastAPI), `Shutil` (File saving), `BackgroundTasks` (for notifications).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/incidents.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# 1. Standard Incident Report
class IncidentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    incident_type: str = Field(..., description="flood, accident, fire, earthquake, other")
    latitude: float
    longitude: float

# 2. One-Tap SOS Request
class SOSRequest(BaseModel):
    latitude: float
    longitude: float
    # Optional: User can send a quick note immediately, but usually it's empty
    quick_note: Optional[str] = "SOS Signal Triggered" 

# 3. Incident Response (Read)
class IncidentResponse(BaseModel):
    incident_id: UUID
    reported_by_user_id: Optional[UUID]
    title: str
    description: Optional[str]
    incident_type: str
    status: str
    reported_at: datetime
    latitude: float
    longitude: float
    media_urls: List[str] = [] # URLs to images/audio

    class Config:
        from_attributes = True
```

-----

### **2. Endpoints**

#### **A. `POST /incidents`**

  * **Purpose:** Standard reporting by a Civilian (e.g., "I see a fire in the building").
  * **Role:** Civilian.
  * **Logic:**
    1.  Create `Incident` object.
    2.  **Geo Processing:** Convert Lat/Lon to `WKTElement('POINT(lon lat)', srid=4326)`.
    3.  Set `status` = 'open'.
    4.  Save to DB.
  * **Returns:** `IncidentResponse` (includes the new `incident_id`).

#### **B. `POST /incidents/sos`**

  * **Purpose:** **High Priority** One-Tap SOS.
  * **Role:** Civilian.
  * **Logic:**
    1.  **Minimal Latency:** This endpoint must be fast.
    2.  **Auto-Fill:**
          * `title`: "SOS: Emergency Alert"
          * `incident_type`: "other" (or a specific "sos" type if added to Enum).
          * `description`: "One-tap SOS trigger from user."
    3.  **Save to DB:** Insert row with the GPS location.
  * **Returns:** `IncidentResponse` (Civilian app needs the ID to upload photos in the next step).

#### **C. `POST /incidents/{incident_id}/media`**

  * **Purpose:** Upload context (Image, Voice Note) for an existing incident/SOS.
  * **Role:** Civilian (Reporter) or Responder.
  * **Input:** `file: UploadFile`.
  * **Logic:**
    1.  **Validation:** Check `file.content_type` (image/*, audio/*, video/\*).
    2.  **Storage:**
          * Generate a unique filename (UUID + extension).
          * Save file to a local directory `app/static/uploads/incidents/`.
    3.  **DB Insert:**
          * Insert into `disaster_media`.
          * Set `incident_id` = `{incident_id}`.
          * Set `file_type` based on MIME type.
          * Set `storage_path`.
  * **Returns:** `{"media_id": UUID, "url": "static/..."}`.

#### **D. `GET /incidents`**

  * **Purpose:** Commander Dashboard Feed.
  * **Role:** Commander Only.
  * **Filters:** Query params: `status` (default 'open'), `type`, `days_old`.
  * **Logic:**
      * Query `incidents` table.
      * Filter by status (Commanders usually want to see 'open' incidents to decide on conversion).
      * **Geo:** Convert DB Geometry column -\> Lat/Lon for JSON response.
  * **Returns:** List of `IncidentResponse`.

#### **E. `PATCH /incidents/{incident_id}/status`**

  * **Purpose:** Dismiss an incident (False Alarm).
  * **Role:** Commander.
  * **Input:** Body `{"status": "discarded"}`.
  * **Logic:** Update status. (Note: "Conversion" to disaster is handled in `disasters.py`, not here).