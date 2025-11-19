### **Router Specification: `app/routers/responders.py`**

**Purpose:** Allow Commanders to provision Responder accounts, create functional Teams, and manage the assignment of personnel.
**Permissions:** All endpoints in this file must be protected by a dependency: `RequireRole("commander")` (Role ID 3).
**Dependencies:** `SQLAlchemy` (Transactions are critical here), `PostGIS` (for Team location derivation).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/responders.py`.

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# --- TEAM SCHEMAS ---

class TeamCreateRequest(BaseModel):
    name: str
    team_type: str = Field(..., description="medic, fire, police, mixed, disaster_response")
    commander_user_id: Optional[UUID] = None # Optional: Assign a specific sub-commander/leader

class TeamResponse(BaseModel):
    team_id: UUID
    name: str
    team_type: str
    status: str
    member_count: int # Calculated field
    # The dynamic location of the team (based on leader/logistician)
    current_latitude: Optional[float] 
    current_longitude: Optional[float]

# --- RESPONDER SCHEMAS ---

class ResponderCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] # Commander might know this
    responder_type: str = Field(..., description="medic, firefighter, police, disaster_responder, logistician")
    badge_number: str
    team_id: Optional[UUID] = None # Can assign to team immediately upon creation

class ResponderUpdateRequest(BaseModel):
    team_id: Optional[UUID]
    status: Optional[str] # active, suspended, retired
    badge_number: Optional[str]
    qualifications: Optional[str]

class ResponderResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: Optional[str]
    responder_type: str
    badge_number: str
    team_name: Optional[str] # Joined field
    status: str
    last_known_latitude: Optional[float]
    last_known_longitude: Optional[float]
```

-----

### **2. Endpoints**

#### **A. `POST /teams`**

  * **Purpose:** Create a new operational unit (e.g., "Alpha Fire Squad").
  * **Input:** `TeamCreateRequest`.
  * **Logic:**
    1.  Insert into `teams` table.
    2.  Default `status` to 'available'.
  * **Returns:** `TeamResponse` (with 0 members and null location initially).

#### **B. `GET /teams`**

  * **Purpose:** List all teams with their **Real-Time Location**.
  * **Input:** Query params (optional): `status` (available/deployed), `type`.
  * **Logic:**
      * **The Location Problem:** A team is an abstract entity. Its location is defined by its leader or logistician.
      * **Query:** Join `teams` with `users` (where `users.user_id` = `teams.commander_user_id`).
      * **Calculate Location:** Extract `last_known_location` from the joined user. If the team has no leader assigned, location is `null`.
      * **Member Count:** Sub-query count of `responder_profiles` where `team_id` matches.
  * **Returns:** List of `TeamResponse`.

#### **C. `POST /responders` (The Provisioning Flow)**

  * **Purpose:** Commander creates a *pre-verified* account for a Responder.
  * **Input:** `ResponderCreateRequest`.
  * **Implementation Logic (Transaction Required):**
    This needs to be atomic. If one step fails, rollback everything.
    1.  **Check Email:** If `email` exists in `users`, raise 400 (or 409 Conflict).
    2.  **Insert User:**
          * `INSERT INTO users (email, role_id, is_active) VALUES (input.email, 2, true)`.
          * *Note:* `provider_id` is NULL. It will be filled when the user logs in via Google with this email.
    3.  **Insert Profile:**
          * `INSERT INTO user_profiles (user_id, full_name) ...`.
    4.  **Insert Responder Profile:**
          * `INSERT INTO responder_profiles (user_id, responder_type, badge_number, team_id, created_by_commander_id) ...`.
    5.  **Commit.**
  * **Returns:** The created `ResponderResponse`.

#### **D. `GET /responders`**

  * **Purpose:** Directory of all personnel.
  * **Input:** Query params: `team_id`, `responder_type`, `status`.
  * **Logic:**
      * Join `users`, `user_profiles`, `responder_profiles`, and `teams`.
      * Filter based on params.
      * **Geo:** Convert `users.last_known_location` to Lat/Lon for the map view.
  * **Returns:** List of `ResponderResponse`.

#### **E. `PATCH /responders/{user_id}`**

  * **Purpose:** Administrative updates (Promotions, Reassignments).
  * **Input:** `ResponderUpdateRequest`.
  * **Logic:**
    1.  Check if responder exists.
    2.  **Team Assignment:** If `team_id` is provided:
          * Update `responder_profiles.team_id`.
          * Update `responder_profiles.team_joined_at` = `NOW()`.
    3.  **Status Change:** If status changes to 'suspended', you might want to set `users.is_active = False` as well (optional business logic).
  * **Returns:** Updated `ResponderResponse`.
