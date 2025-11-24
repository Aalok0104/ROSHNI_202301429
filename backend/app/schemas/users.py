from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
from datetime import date
from uuid import UUID

# --- 1. Onboarding ---
class UserOnboardingRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$", description="E.164 format")
    date_of_birth: date

# --- 2. Profile Updates ---
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

class MedicalProfileUpdate(BaseModel):
    blood_group: Optional[str] = None
    known_allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    other_medical_notes: Optional[str] = None
    consent_flags: Dict[str, bool] = Field(default_factory=lambda: {"share_all": False})

# --- 3. Location ---
class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

# --- 4. Medical Access (Responder View) ---
class MedicalAccessRequest(BaseModel):
    public_user_code: str

class FilteredMedicalResponse(BaseModel):
    full_name: str
    blood_group: Optional[str]
    known_allergies: Optional[str]
    chronic_conditions: Optional[str]
    current_medications: Optional[str]
    other_medical_notes: Optional[str]
    # Sensitive fields are Optional because they might be redacted
    sensitive_address: Optional[str] = None
    sensitive_phone: Optional[str] = None

# --- 5. Full Profile Response (User View) ---
class UserProfileResponse(BaseModel):
    user_id: UUID
    email: Optional[str]
    phone_number: Optional[str]
    full_name: str
    date_of_birth: Optional[date]
    address: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    public_user_code: Optional[str]
    blood_group: Optional[str]
    known_allergies: Optional[str]
    consent_flags: Dict[str, bool]

    class Config:
        from_attributes = True


# --- 6. Commander Management ---
class CommanderCreateRequest(BaseModel):
    email: str
    full_name: str
    phone_number: Optional[str] = None


class CommanderUpdateRequest(BaseModel):
    phone_number: Optional[str] = None
    profile: Optional[UserProfileUpdate] = None


class CommanderResponse(BaseModel):
    user_id: UUID
    email: Optional[str]
    phone_number: Optional[str]
    full_name: Optional[str]

    class Config:
        from_attributes = True
