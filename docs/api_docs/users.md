### **Router Specification: `app/routers/users.py`**

**Purpose:** Manage user profiles, medical data, consent settings, and location updates.
**Dependencies:** `SQLAlchemy`, `GeoAlchemy2` (for location), `Auth Dependency` (to get `current_user`).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/users.py`.

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import date

# 1. Onboarding / Basic Info
class UserOnboardingRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    date_of_birth: date

# 2. General Profile Update
class UserProfileUpdate(BaseModel):
    full_name: Optional[str]
    address: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]

# 3. Medical Profile Update
class MedicalProfileUpdate(BaseModel):
    blood_group: Optional[str]
    known_allergies: Optional[str]
    chronic_conditions: Optional[str]
    current_medications: Optional[str]
    other_medical_notes: Optional[str]
    # The Consent Flags: e.g. {'allow_police': False, 'allow_medic': True}
    consent_flags: Dict[str, bool] 

# 4. Location Update
class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

# 5. Responder Access Request
class MedicalAccessRequest(BaseModel):
    public_user_code: str # The 6-digit code provided by the civilian verbally

# 6. Filtered Medical Response (The output for Responders)
class FilteredMedicalResponse(BaseModel):
    full_name: str
    blood_group: Optional[str]
    known_allergies: Optional[str]
    chronic_conditions: Optional[str]
    current_medications: Optional[str]
    # Only shown if consent is TRUE
    sensitive_address: Optional[str] = None
    sensitive_phone: Optional[str] = None
```

-----

### **2. Endpoints**

#### **A. `PATCH /users/me/onboarding`**

  * **Purpose:** Completes the registration flow for Google Login users.
  * **Input:** `UserOnboardingRequest` (Phone, DOB).
  * **Logic:**
    1.  Get `current_user` from session.
    2.  Update `users` table: set `phone_number`.
    3.  Update `user_profiles` table: set `date_of_birth`.
    4.  **Auto-Generate Code:** Generate a unique 6-character alphanumeric string (e.g., `AB78X9`) and insert it into `user_medical_profiles.public_user_code`. This is crucial for the future responder handshake.
  * **Returns:** `200 OK` with updated user status.

#### **B. `GET /users/me/profile`**

  * **Purpose:** Returns the full view of the user for their own dashboard.
  * **Input:** None.
  * **Logic:**
      * Perform a joined query: `users` + `user_profiles` + `user_medical_profiles`.
  * **Returns:** A composite JSON object containing all profile and medical fields.

#### **C. `PUT /users/me/profile`**

  * **Purpose:** Update general contact info.
  * **Input:** `UserProfileUpdate`.
  * **Logic:** Update specific fields in `user_profiles` where `user_id = current_user.id`.

#### **D. `PUT /users/me/medical`**

  * **Purpose:** Update medical history and **Privacy Settings**.
  * **Input:** `MedicalProfileUpdate`.
  * **Logic:**
      * Update `user_medical_profiles`.
      * **Critical:** Ensure `consent_flags` is stored correctly as a JSONB object. Default flags (if missing) should be `{ "share_all": false }`.

#### **E. `POST /users/me/location`**

  * **Purpose:** The heartbeat of the app. Updates the user's position for the "10km logic".
  * **Input:** `LocationUpdate` (Lat, Lon).
  * **Logic:**
    1.  **Update Current:** Update `users.last_known_location` using PostGIS `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`. Update `last_location_at` to `NOW()`.
    2.  **Log History:** Insert a new row into `user_location_logs`.
    <!-- end list -->
      * *Optimization Note:* If the user hasn't moved significantly (e.g., \< 10 meters) since the last log, you might choose to skip the *Log History* insert to save DB space, but always update the *Current* location.

#### **F. `POST /users/access-medical`**

  * **Purpose:** **(Responder Only)** Retrieve a civilian's data using their unique code.
  * **Permission:** Requires `role_id` to be Responder (2) or Commander (3).
  * **Input:** `MedicalAccessRequest` (Code).
  * **Logic:**
    1.  Query `user_medical_profiles` to find the `user_id` associated with `public_user_code`.
          * *If not found:* Return 404.
    2.  Retrieve the target's `consent_flags` and `responder_type` (of the requester).
    3.  **Apply Privacy Filter:**
          * **Always Return:** `blood_group`, `known_allergies`, `current_medications` (Vital for life-saving).
          * **Conditional Return:**
              * Check `consent_flags`.
              * Example: If `consent_flags['hide_address']` is `True`, set `response.sensitive_address = None`.
              * Example: If the responder is `police` and `consent_flags['block_police']` is `True`, restrict PII.
  * **Returns:** `FilteredMedicalResponse`.
