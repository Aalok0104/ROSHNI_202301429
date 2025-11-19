import logging
from typing import Dict, Optional
import os
import uuid

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, JSONResponse

from ...docs import models
from .database import SessionLocal, engine

if engine.dialect.name == "postgresql":  # Avoid GeoAlchemy setup on unsupported engines
    models.Base.metadata.create_all(bind=engine)

app = FastAPI()

config = Config(environ=os.environ)
logger = logging.getLogger(__name__)

allowed_origins = [
    origin.strip()
    for origin in config("ALLOWED_ORIGINS", default="http://localhost:5173").split(",")
    if origin.strip()
]
frontend_redirect_url = config("FRONTEND_REDIRECT_URL", default="http://localhost:5173")
logger = logging.getLogger(__name__)
logger.warning("Using FRONTEND_REDIRECT_URL: %r", frontend_redirect_url)
google_client_id = config("GOOGLE_CLIENT_ID", default="")
google_client_secret = config("GOOGLE_CLIENT_SECRET", default="")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key=config("SESSION_SECRET", default="!secret"))

oauth = OAuth(config)

CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
oauth.register(
    name="google",
    client_id=google_client_id,
    client_secret=google_client_secret,
    server_metadata_url=CONF_URL,
    client_kwargs={"scope": "openid email profile"},
)


def _ensure_google_oauth_config() -> None:
    if google_client_id and google_client_secret:
        return
    logger.error("Google OAuth credentials are not configured")
    raise HTTPException(status_code=500, detail="Google OAuth is not configured")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DEFAULT_ROLE_NAME = "civilian"
ALLOWED_ROLES = {"civilian", "commander", "responder"}


def ensure_role(db: Session, role_name: str) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role:
        return role

    role = models.Role(name=role_name, description=f"{role_name.title()} role")
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def serialize_user(user: models.User, needs_registration: bool = False) -> Dict[str, Optional[str]]:
    profile_name = user.profile.full_name if user.profile else None
    role_name = None
    if user.roles:
        linked_role = user.roles[0].role
        role_name = linked_role.name if linked_role else None

    result = {
        "id": str(user.id),
        "email": user.email,
        "name": profile_name,
        "role": role_name,
    }
    
    if needs_registration:
        result["needsRegistration"] = True
    
    return result


def upsert_user_profile(db: Session, user: models.User, display_name: Optional[str]) -> None:
    fallback_name = display_name or user.email.split("@")[0]
    if user.profile:
        # Don't overwrite manually entered names - user's registration takes precedence
        return

    profile = models.UserProfile(user_id=user.id, full_name=fallback_name)
    db.add(profile)


def upsert_user_role(db: Session, user: models.User, role_name: str) -> None:
    role = ensure_role(db, role_name)
    existing_mapping = (
        db.query(models.UserRole).filter(models.UserRole.user_id == user.id).first()
    )

    if existing_mapping:
        existing_mapping.role_id = role.id
    else:
        db.add(models.UserRole(user_id=user.id, role_id=role.id))


@app.get("/api/auth/google/login")
async def google_login(request: Request):
    _ensure_google_oauth_config()
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/api/auth/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    
    _ensure_google_oauth_config()
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(status_code=401, detail="Could not authorize access token")
    
    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=401, detail="Could not fetch user info")

    email = user_info.get("email")
    name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in user info")

    user = db.query(models.User).filter(models.User.email == email).first()
    is_new_user = False
    
    if not user:
        # New user - create minimal user record and mark for registration
        user = models.User(email=email, hashed_password="oauth")
        db.add(user)
        db.flush()
        is_new_user = True
        db.commit()
        db.refresh(user)
    else:
        # Existing user - update profile if needed
        upsert_user_profile(db, user, name)
        if not user.roles:
            upsert_user_role(db, user, DEFAULT_ROLE_NAME)
        db.commit()
        db.refresh(user)

    # Store user in session with registration flag if new
    request.session["user"] = serialize_user(user, needs_registration=is_new_user)
    
    if is_new_user:
        # Store temporary data for registration completion
        request.session["registration_pending"] = {
            "email": email,
            "google_name": name,
        }

    response = RedirectResponse(url=frontend_redirect_url)
    logger.warning("Callback redirect Location header = %r", response.headers.get("location"))
    return response


@app.get("/api/auth/session")
async def get_session(request: Request):
    user = request.session.get("user")
    if not user:
        return {"user": None}
    return {"user": user}


@app.post("/api/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return JSONResponse({"success": True})


@app.post("/api/auth/complete-registration")
async def complete_registration(request: Request, db: Session = Depends(get_db)):
    """Complete user registration with additional details"""
    user_session = request.session.get("user")
    if not user_session:
        raise HTTPException(401, "Not authenticated")
    
    if not user_session.get("needsRegistration"):
        raise HTTPException(400, "User has already completed registration")
    
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON data")
    
    email = user_session.get("email")
    if not email or email != data.get("email"):
        raise HTTPException(400, "Email mismatch")
    
    # Required fields
    full_name = data.get("fullName")
    phone_number = data.get("phoneNumber")
    date_of_birth = data.get("dateOfBirth")
    role = data.get("role", DEFAULT_ROLE_NAME)
    
    if not full_name or not phone_number or not date_of_birth:
        raise HTTPException(400, "Missing required fields: fullName, phoneNumber, dateOfBirth")
    
    if role not in ALLOWED_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(ALLOWED_ROLES)}")
    
    # Get user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Update phone number
    user.phone_number = phone_number
    
    # Create/Update profile
    if user.profile:
        user.profile.full_name = full_name
        user.profile.address = data.get("address")
        user.profile.date_of_birth = date_of_birth
        
        # Update medical info if provided - store as plain text
        medical_info = data.get("medicalInfo")
        if medical_info:
            user.profile.medical_info = medical_info
    else:
        profile = models.UserProfile(
            user_id=user.id,
            full_name=full_name,
            address=data.get("address"),
            date_of_birth=date_of_birth,
            medical_info=data.get("medicalInfo", ""),
            privacy_settings={}
        )
        db.add(profile)
    
    # Assign role
    upsert_user_role(db, user, role)
    
    # Add emergency contact if provided
    emergency_contact_name = data.get("emergencyContactName")
    emergency_contact_phone = data.get("emergencyContactPhone")
    
    if emergency_contact_name and emergency_contact_phone:
        emergency_contact = models.EmergencyContact(
            user_id=user.id,
            full_name=emergency_contact_name,
            phone_number=emergency_contact_phone,
            relationship_label="Emergency Contact"
        )
        db.add(emergency_contact)
    
    db.commit()
    db.refresh(user)
    
    # Update session - remove registration flag
    request.session["user"] = serialize_user(user, needs_registration=False)
    request.session.pop("registration_pending", None)
    
    return {"user": serialize_user(user), "message": "Registration completed successfully"}

@app.post("/api/user/role")
def create_or_update_user_role(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    name = data.get("name")
    requested_role = data.get("role") or DEFAULT_ROLE_NAME

    if not email:
        raise HTTPException(400, "Email required")

    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(
            400, "Invalid role. Must be 'civilian', 'commander', or 'responder'"
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    created = False

    if not user:
        user = models.User(email=email, hashed_password="oauth")
        db.add(user)
        db.flush()  # ensure user.id for relations
        created = True

    upsert_user_profile(db, user, name)

    # Only override role when creating the user or when client explicitly requests a role change
    if created or data.get("role"):
        upsert_user_role(db, user, requested_role)
    elif not user.roles:
        upsert_user_role(db, user, DEFAULT_ROLE_NAME)

    db.commit()
    db.refresh(user)

    return serialize_user(user)


@app.put("/api/user/role")
def update_user_role(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    new_role = data.get("role")
    
    if not email or not new_role:
        raise HTTPException(400, "Email and role required")
    
    if new_role not in ALLOWED_ROLES:
        raise HTTPException(
            400, "Invalid role. Must be 'civilian', 'commander', or 'responder'"
        )
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    upsert_user_role(db, user, new_role)
    db.commit()
    db.refresh(user)
    
    return serialize_user(user)

@app.get("/api/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [serialize_user(user) for user in users]

@app.get("/api/disasters")
def get_disasters(db: Session = Depends(get_db)):
    disasters = db.query(models.DisasterReport).all()
    return disasters

@app.post("/api/disasters")
def report_disaster(data: dict, db: Session = Depends(get_db)):
    user_email = data.get("user_email")
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user:
        raise HTTPException(404, "User not found")

    disaster = models.DisasterReport(
        type=data.get("type"),
        location=data.get("location"),
        description=data.get("description"),
        user_id=user.id,
    )
    db.add(disaster)
    db.commit()
    db.refresh(disaster)
    return disaster

@app.get("/api/responder/disasters")
def get_responder_disasters(request: Request, db: Session = Depends(get_db)):
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    user = db.query(models.User).filter(models.User.email == user_info["email"]).first()
    if not user:
        raise HTTPException(404, "User not found")

    assignments = db.query(models.DisasterAssignment).filter(models.DisasterAssignment.responder_id == user.id).all()
    disasters = [a.disaster for a in assignments]
    return disasters

@app.put("/api/responder/disasters/{disaster_id}")
def update_disaster_status(disaster_id: int, data: dict, db: Session = Depends(get_db)):
    disaster = db.query(models.DisasterReport).filter(models.DisasterReport.id == disaster_id).first()
    if not disaster:
        raise HTTPException(404, "Disaster not found")
    
    disaster.status = data.get("status")
    db.commit()
    db.refresh(disaster)
    return disaster


# Chat Group Management Endpoints
@app.get("/api/responders")
def get_all_responders(request: Request, db: Session = Depends(get_db)):
    """Get all users with responder role - only accessible by commanders"""
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    # Check if user is commander
    if user_info.get("role") != "commander":
        raise HTTPException(403, "Only commanders can view responders list")
    
    # Get responder role
    responder_role = db.query(models.Role).filter(models.Role.name == "responder").first()
    if not responder_role:
        return []
    
    # Get all users with responder role
    responders = (
        db.query(models.User)
        .join(models.UserRole)
        .filter(models.UserRole.role_id == responder_role.id)
        .all()
    )
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "name": user.profile.full_name if user.profile else user.email,
            "phone": user.phone_number,
        }
        for user in responders
    ]


@app.post("/api/chat/groups")
def create_chat_group(request: Request, data: dict, db: Session = Depends(get_db)):
    """Create a new chat group - only commanders can create groups"""
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    # Check if user is commander
    if user_info.get("role") != "commander":
        raise HTTPException(403, "Only commanders can create groups")
    
    # Get commander user
    commander = db.query(models.User).filter(models.User.email == user_info["email"]).first()
    if not commander:
        raise HTTPException(404, "User not found")
    
    group_name = data.get("name")
    member_ids = data.get("memberIds", [])
    
    if not group_name:
        raise HTTPException(400, "Group name is required")
    
    if not member_ids:
        raise HTTPException(400, "At least one member is required")
    
    # Create group
    group = models.ChatGroup(
        name=group_name,
        created_by_user_id=commander.id,
    )
    db.add(group)
    db.flush()
    
    # Add commander as member
    commander_member = models.ChatGroupMember(
        group_id=group.id,
        user_id=commander.id,
    )
    db.add(commander_member)
    
    # Add selected responders as members
    for member_id in member_ids:
        try:
            user_uuid = uuid.UUID(member_id)
            member = models.ChatGroupMember(
                group_id=group.id,
                user_id=user_uuid,
            )
            db.add(member)
        except (ValueError, AttributeError):
            continue
    
    db.commit()
    db.refresh(group)
    
    # Return group with members
    members = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == group.id
    ).all()
    
    return {
        "id": str(group.id),
        "name": group.name,
        "createdBy": str(group.created_by_user_id),
        "createdAt": group.created_at.isoformat(),
        "members": [
            {
                "id": str(m.user_id),
                "name": m.user.profile.full_name if m.user.profile else m.user.email,
            }
            for m in members
        ],
    }


@app.get("/api/chat/groups")
def get_user_chat_groups(request: Request, db: Session = Depends(get_db)):
    """Get all chat groups for the current user"""
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    user = db.query(models.User).filter(models.User.email == user_info["email"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Get all groups where user is a member
    memberships = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.user_id == user.id
    ).all()
    
    groups = []
    for membership in memberships:
        group = membership.group
        members = db.query(models.ChatGroupMember).filter(
            models.ChatGroupMember.group_id == group.id
        ).all()
        
        # Get last message
        last_message = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.group_id == group.id)
            .order_by(models.ChatMessage.created_at.desc())
            .first()
        )
        
        groups.append({
            "id": str(group.id),
            "name": group.name,
            "createdBy": str(group.created_by_user_id),
            "createdAt": group.created_at.isoformat(),
            "members": [
                {
                    "id": str(m.user_id),
                    "name": m.user.profile.full_name if m.user.profile else m.user.email,
                    "email": m.user.email,
                }
                for m in members
            ],
            "lastMessage": {
                "text": last_message.message_text,
                "senderName": last_message.sender.profile.full_name if last_message.sender.profile else last_message.sender.email,
                "createdAt": last_message.created_at.isoformat(),
            } if last_message else None,
        })
    
    return groups


@app.get("/api/chat/groups/{group_id}/messages")
def get_group_messages(group_id: str, request: Request, db: Session = Depends(get_db)):
    """Get all messages in a chat group"""
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    user = db.query(models.User).filter(models.User.email == user_info["email"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    try:
        group_uuid = uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(400, "Invalid group ID")
    
    # Check if user is member of group
    membership = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == group_uuid,
        models.ChatGroupMember.user_id == user.id,
    ).first()
    
    if not membership:
        raise HTTPException(403, "You are not a member of this group")
    
    # Get messages
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.group_id == group_uuid)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    
    return [
        {
            "id": str(msg.id),
            "groupId": str(msg.group_id),
            "senderId": str(msg.sender_id),
            "senderName": msg.sender.profile.full_name if msg.sender.profile else msg.sender.email,
            "text": msg.message_text,
            "createdAt": msg.created_at.isoformat(),
        }
        for msg in messages
    ]


@app.post("/api/chat/groups/{group_id}/messages")
def send_group_message(group_id: str, data: dict, request: Request, db: Session = Depends(get_db)):
    """Send a message to a chat group"""
    user_info = request.session.get("user")
    if not user_info:
        raise HTTPException(401, "Not authenticated")
    
    user = db.query(models.User).filter(models.User.email == user_info["email"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    try:
        group_uuid = uuid.UUID(group_id)
    except ValueError:
        raise HTTPException(400, "Invalid group ID")
    
    # Check if user is member of group
    membership = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == group_uuid,
        models.ChatGroupMember.user_id == user.id,
    ).first()
    
    if not membership:
        raise HTTPException(403, "You are not a member of this group")
    
    message_text = data.get("text")
    if not message_text:
        raise HTTPException(400, "Message text is required")
    
    # Create message
    message = models.ChatMessage(
        group_id=group_uuid,
        sender_id=user.id,
        message_text=message_text,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return {
        "id": str(message.id),
        "groupId": str(message.group_id),
        "senderId": str(message.sender_id),
        "senderName": user.profile.full_name if user.profile else user.email,
        "text": message.message_text,
        "createdAt": message.created_at.isoformat(),
    }


# Profile Management Endpoints
@app.get("/api/users/profile")
async def get_user_profile(request: Request, db: Session = Depends(get_db)):
    """Get current user's profile information"""
    session_user = request.session.get("user")
    if not session_user or not session_user.get("id"):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_uuid = uuid.UUID(session_user["id"])
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get emergency contact if exists
    emergency_contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user.id
    ).first()
    
    # Handle medical_info - extract as string if it's stored as JSON
    medical_info_text = ""
    if user.profile and user.profile.medical_info:
        if isinstance(user.profile.medical_info, dict):
            # If it's a dict, try to get a 'text' field or stringify it
            medical_info_text = user.profile.medical_info.get('text', str(user.profile.medical_info))
        else:
            medical_info_text = str(user.profile.medical_info)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.profile.full_name if user.profile else None,
        "phone": user.phone_number,
        "address": user.profile.address if user.profile else None,
        "emergency_contact": emergency_contact.phone_number if emergency_contact else None,
        "emergency_contact_name": emergency_contact.full_name if emergency_contact else None,
        "date_of_birth": user.profile.date_of_birth.isoformat() if user.profile and user.profile.date_of_birth else None,
        "medical_info": medical_info_text,
    }


@app.put("/api/users/profile")
async def update_user_profile(request: Request, db: Session = Depends(get_db)):
    """Update current user's profile information"""
    session_user = request.session.get("user")
    if not session_user or not session_user.get("id"):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_uuid = uuid.UUID(session_user["id"])
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    data = await request.json()
    
    # Update phone number
    if "phone" in data and data["phone"]:
        user.phone_number = data["phone"]
    
    # Update or create profile
    if user.profile:
        if "address" in data:
            user.profile.address = data["address"]
        if "date_of_birth" in data and data["date_of_birth"]:
            from datetime import datetime
            user.profile.date_of_birth = datetime.fromisoformat(data["date_of_birth"]).date()
        if "medical_info" in data:
            # Store medical_info as plain text string
            user.profile.medical_info = data["medical_info"] if data["medical_info"] else None
    else:
        # Create new profile - use existing full_name, don't update it
        from datetime import datetime
        dob = None
        if "date_of_birth" in data and data["date_of_birth"]:
            dob = datetime.fromisoformat(data["date_of_birth"]).date()
        
        profile = models.UserProfile(
            user_id=user.id,
            full_name=user.profile.full_name if user.profile else user.email.split("@")[0],
            address=data.get("address"),
            date_of_birth=dob,
            medical_info=data.get("medical_info"),
        )
        db.add(profile)
    
    # Update or create emergency contact
    if "emergency_contact" in data and data["emergency_contact"]:
        emergency_contact = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user.id
        ).first()
        
        if emergency_contact:
            emergency_contact.phone_number = data["emergency_contact"]
            if "emergency_contact_name" in data and data["emergency_contact_name"]:
                emergency_contact.full_name = data["emergency_contact_name"]
        else:
            emergency_contact = models.EmergencyContact(
                user_id=user.id,
                full_name=data.get("emergency_contact_name", "Emergency Contact"),
                phone_number=data["emergency_contact"],
                relationship_label="Emergency",
            )
            db.add(emergency_contact)
    
    db.commit()
    db.refresh(user)
    
    # Update session with new name
    if user.profile:
        session_user["name"] = user.profile.full_name
        request.session["user"] = session_user
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.profile.full_name if user.profile else None,
        "phone": user.phone_number,
        "address": user.profile.address if user.profile else None,
        "message": "Profile updated successfully"
    }