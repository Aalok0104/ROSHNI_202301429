from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user, RoleChecker
from app.models.user_family_models import User
from app.repositories.user_repository import UserRepository
from app.schemas.users import (
    UserOnboardingRequest,
    UserProfileUpdate,
    MedicalProfileUpdate,
    LocationUpdate,
    MedicalAccessRequest,
    FilteredMedicalResponse,
    UserProfileResponse,
    CommanderCreateRequest,
    CommanderUpdateRequest,
    CommanderResponse,
)

router = APIRouter(prefix="/users", tags=["User Management"])

# --- A. Onboarding ---
@router.patch("/me/onboarding")
async def complete_onboarding(
    payload: UserOnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    updated_user = await repo.complete_onboarding(
        user_id=current_user.user_id,
        phone=payload.phone_number,
        dob=payload.date_of_birth
    )
    return {"message": "Onboarding complete", "user_id": updated_user.user_id}

# --- B. Get Profile (Dashboard) ---
@router.get("/me/profile", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    # Mapping SQLAlchemy models to Pydantic Response
    # Using default values in case profile parts are missing
    return UserProfileResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        phone_number=current_user.phone_number,
        full_name=current_user.profile.full_name if current_user.profile else "Unknown",
        date_of_birth=current_user.profile.date_of_birth if current_user.profile else None,
        address=current_user.profile.address if current_user.profile else None,
        emergency_contact_name=current_user.profile.emergency_contact_name if current_user.profile else None,
        emergency_contact_phone=current_user.profile.emergency_contact_phone if current_user.profile else None,
        # Medical
        public_user_code=current_user.medical_profile.public_user_code if current_user.medical_profile else None,
        blood_group=current_user.medical_profile.blood_group if current_user.medical_profile else None,
        known_allergies=current_user.medical_profile.known_allergies if current_user.medical_profile else None,
        consent_flags=current_user.medical_profile.consent_flags if current_user.medical_profile else {},
    )

# --- C. Update General Profile ---
@router.put("/me/profile")
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    await repo.update_user_profile(
        current_user.user_id, payload.model_dump(exclude_none=True)
    )
    return {"message": "Profile updated"}

# --- D. Update Medical Profile ---
@router.put("/me/medical")
async def update_medical_profile(
    payload: MedicalProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    await repo.update_medical_profile(
        current_user.user_id, payload.model_dump(exclude_none=True)
    )
    return {"message": "Medical profile updated"}

# --- E. Update Location (Heartbeat) ---
@router.post("/me/location")
async def update_location(
    payload: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    await repo.update_location(current_user.user_id, payload.latitude, payload.longitude)
    return {"message": "Location updated"}

# --- F. Access Medical Data (Responder Handshake) ---
@router.post("/access-medical", response_model=FilteredMedicalResponse)
async def access_medical_data(
    payload: MedicalAccessRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check Permission (Role 2=Responder, 3=Commander)
    if current_user.role_id not in [2, 3]:
        raise HTTPException(status_code=403, detail="Only responders can access medical data.")

    repo = UserRepository(db)
    target_user = await repo.get_user_by_medical_code(payload.public_user_code)

    if not target_user or not target_user.medical_profile:
        raise HTTPException(status_code=404, detail="Invalid code or user has no medical profile.")

    # 2. Logic: Privacy Handshake
    med_profile = target_user.medical_profile
    base_profile = target_user.profile
    consent = med_profile.consent_flags or {}

    # Prepare Response
    response = FilteredMedicalResponse(
        full_name=base_profile.full_name,
        blood_group=med_profile.blood_group,
        known_allergies=med_profile.known_allergies,
        chronic_conditions=med_profile.chronic_conditions,
        current_medications=med_profile.current_medications,
        other_medical_notes=med_profile.other_medical_notes,
        sensitive_address=None,
        sensitive_phone=None
    )

    # 3. Apply Flags
    # Check if we have specific flags. Default behavior: Hide PII unless allowed.
    # Flag: 'share_all' overrides specific restrictions
    if consent.get("share_all", False) is True:
        response.sensitive_address = base_profile.address
        response.sensitive_phone = target_user.phone_number
    else:
        # Granular checks
        # TODO: In Phase 2, check ResponderProfile.type (Police vs Medic)
        # For now, we check generic "allow_access" or specific flags
        if consent.get("allow_address", False):
            response.sensitive_address = base_profile.address
        if consent.get("allow_phone", False):
            response.sensitive_phone = target_user.phone_number

    return response


@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    deleted = await repo.delete_user(current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Account deleted"}


# --- Commander Management ---
@router.post("/commander/commanders", response_model=CommanderResponse, dependencies=[Depends(RoleChecker(["commander"]))])
async def create_commander_account(
    payload: CommanderCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    commander = await repo.create_commander(
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
    )
    return CommanderResponse(
        user_id=commander.user_id,
        email=commander.email,
        phone_number=commander.phone_number,
        full_name=commander.profile.full_name if commander.profile else None,
    )


@router.get("/commander/commanders", response_model=list[CommanderResponse], dependencies=[Depends(RoleChecker(["commander"]))])
async def list_commanders(db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    commanders = await repo.list_commanders()
    return [
        CommanderResponse(
            user_id=u.user_id,
            email=u.email,
            phone_number=u.phone_number,
            full_name=u.profile.full_name if u.profile else None,
        )
        for u in commanders
    ]


@router.patch(
    "/commander/commanders/{user_id}",
    response_model=CommanderResponse,
    dependencies=[Depends(RoleChecker(["commander"]))],
)
async def update_commander_account(
    user_id: UUID,
    payload: CommanderUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    commander = await repo.get_by_id(user_id)
    if not commander or commander.role_id != 3:
        raise HTTPException(status_code=404, detail="Commander not found")

    if payload.phone_number:
        await repo.update_phone_number(user_id, payload.phone_number)
    if payload.profile:
        await repo.update_user_profile(user_id, payload.profile.model_dump(exclude_none=True))
    updated = await repo.get_by_id(user_id)
    return CommanderResponse(
        user_id=updated.user_id,
        email=updated.email,
        phone_number=updated.phone_number,
        full_name=updated.profile.full_name if updated.profile else None,
    )


@router.delete(
    "/commander/commanders/{user_id}",
    dependencies=[Depends(RoleChecker(["commander"]))],
)
async def delete_commander_account(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    commander = await repo.get_by_id(user_id)
    if not commander or commander.role_id != 3:
        raise HTTPException(status_code=404, detail="Commander not found")
    await repo.delete_user(user_id)
    return {"message": "Commander deleted"}
