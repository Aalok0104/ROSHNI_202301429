import secrets
from uuid import UUID
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from geoalchemy2.elements import WKTElement

from app.models.user_family_models import User, UserProfile, UserMedicalProfile

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Fetch user with all profiles loaded."""
        query = (
            select(User)
            .options(
                selectinload(User.profile),
                selectinload(User.medical_profile),
                selectinload(User.role)
            )
            .where(User.user_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> User | None:
        query = select(User).options(selectinload(User.role)).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def create_civilian(self, email: str, provider_id: str, full_name: str) -> User:
        """Basic creation used by Auth flow."""
        new_user = User(email=email, provider_id=provider_id, role_id=1, is_active=True)
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)  # Refresh to get user_id in async context
        
        new_profile = UserProfile(user_id=new_user.user_id, full_name=full_name)
        self.db.add(new_profile)
        await self.db.commit()
        
        # Reload user with role relationship
        return await self.get_by_id(new_user.user_id)

    async def update_provider_id(self, user_id: UUID, provider_id: str):
        stmt = update(User).where(User.user_id == user_id).values(provider_id=provider_id)
        await self.db.execute(stmt)
        await self.db.commit()

    # --- New Methods for Users.py ---

    async def complete_onboarding(self, user_id: UUID, phone: str, dob: str) -> User:
        """
        Updates phone, DOB, and generates unique medical code in a transaction.
        """
        # Retry logic for collision (very rare with 3 bytes hex) - wrap updates + insert
        max_retries = 5
        for _ in range(max_retries):
            code = secrets.token_hex(3).upper() # e.g., "3F2A9C"
            try:
                # 1. Update User Phone
                await self.db.execute(
                    update(User).where(User.user_id == user_id).values(phone_number=phone)
                )

                # 2. Update Profile DOB
                await self.db.execute(
                    update(UserProfile).where(UserProfile.user_id == user_id).values(date_of_birth=dob)
                )

                # 3. Create Medical Profile
                med_profile = UserMedicalProfile(
                    user_id=user_id,
                    public_user_code=code,
                    consent_flags={"share_all": False}
                )
                self.db.add(med_profile)
                await self.db.commit()
                break
            except IntegrityError:
                await self.db.rollback()
                continue
        
        return await self.get_by_id(user_id)

    async def update_user_profile(self, user_id: UUID, data: dict):
        # Remove None values to avoid overwriting with null
        clean_data = {k: v for k, v in data.items() if v is not None}
        if clean_data:
            stmt = update(UserProfile).where(UserProfile.user_id == user_id).values(**clean_data)
            await self.db.execute(stmt)
            await self.db.commit()

    async def update_medical_profile(self, user_id: UUID, data: dict):
        clean_data = {k: v for k, v in data.items() if v is not None}
        if clean_data:
            stmt = update(UserMedicalProfile).where(UserMedicalProfile.user_id == user_id).values(**clean_data)
            await self.db.execute(stmt)
            await self.db.commit()

    async def update_location(self, user_id: UUID, lat: float, lon: float):
        """Updates geospatial location using WKT."""
        # PostGIS Point: SRID 4326 (WGS 84)
        point = WKTElement(f'POINT({lon} {lat})', srid=4326)
        
        stmt = (
            update(User)
            .where(User.user_id == user_id)
            .values(
                last_known_location=point,
                last_location_at=func.now()
            )
        )
        await self.db.execute(stmt)
        
        # TODO: Insert into user_location_logs here if that model is available.
        await self.db.commit()

    async def get_user_by_medical_code(self, code: str) -> User | None:
        """Finds a user by their public medical code."""
        query = (
            select(User)
            .join(UserMedicalProfile)
            .options(
                selectinload(User.medical_profile),
                selectinload(User.profile)
            )
            .where(UserMedicalProfile.public_user_code == code)
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def delete_user(self, user_id: UUID):
        user = await self.db.get(User, user_id)
        if not user:
            return None
        await self.db.execute(User.__table__.delete().where(User.user_id == user_id))
        await self.db.commit()
        return True

    async def update_phone_number(self, user_id: UUID, phone_number: str):
        await self.db.execute(
            update(User).where(User.user_id == user_id).values(phone_number=phone_number)
        )
        await self.db.commit()

    async def create_commander(self, email: str, full_name: str, phone_number: str | None = None) -> User:
        """
        Creates a commander account with profile.
        """
        new_user = User(email=email, phone_number=phone_number, role_id=3, is_active=True)
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)

        profile = UserProfile(user_id=new_user.user_id, full_name=full_name)
        self.db.add(profile)
        await self.db.commit()
        return await self.get_by_id(new_user.user_id)

    async def list_commanders(self) -> list[User]:
        query = (
            select(User)
            .options(selectinload(User.profile))
            .where(User.role_id == 3)
        )
        result = await self.db.execute(query)
        return result.scalars().all()
