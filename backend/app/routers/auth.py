from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

from app.config import settings
from app.database import get_db
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Pydantic Schemas ---
class UserSessionResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    role: str
    is_profile_complete: bool
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

# --- OAuth Setup ---
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# --- Endpoints ---

@router.get("/login")
async def login(request: Request):
    """Redirects user to Google Login."""
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handles Google Callback, checks DB, creates session."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth Error: {str(e)}")

    user_info = token.get('userinfo')
    if not user_info:
        # Fallback if userinfo not in token (rare with openid scope)
        user_info = await oauth.google.userinfo(token=token)

    email = user_info.get('email')
    google_sub = user_info.get('sub') # Provider ID
    full_name = user_info.get('name', 'Unknown')
    picture = user_info.get('picture')

    repo = UserRepository(db)
    existing_user = await repo.get_by_email(email)

    user_obj = None

    if existing_user:
        # BRANCH A: User Exists (Responder or Returning Civilian)
        if existing_user.provider_id is None:
            # Link the accounts (Pre-registered Responder flow)
            await repo.update_provider_id(existing_user.user_id, google_sub)
        
        user_obj = existing_user
    else:
        # BRANCH B: New User (Civilian)
        user_obj = await repo.create_civilian(
            email=email, 
            provider_id=google_sub, 
            full_name=full_name
        )

    # Create Session
    request.session['user_id'] = str(user_obj.user_id)
    # We assume user_obj.role is loaded via repo (eager load)
    # If role object is loaded:
    role_name = user_obj.role.name if user_obj.role else "civilian"
    request.session['role'] = role_name
    request.session['picture'] = picture # Optional: store pic in session

    # Redirect to Frontend Dashboard
    # Replace with your actual frontend URL
    frontend_url = "http://localhost:3000/dashboard" 
    return RedirectResponse(url=frontend_url)

@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserSessionResponse)
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    user_id_str = request.session.get('user_id')
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Not authenticated")

    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id_str))

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="User not found")

    # Calculate Logic for Profile Completion
    # User needs Phone Number AND DOB (from Profile)
    has_phone = user.phone_number is not None
    has_dob = user.profile.date_of_birth is not None if user.profile else False
    
    is_complete = has_phone and has_dob

    role_name = user.role.name if user.role else "civilian"

    return UserSessionResponse(
        user_id=user.user_id,
        email=user.email,
        role=role_name,
        is_profile_complete=is_complete,
        profile_picture=request.session.get('picture')
    )