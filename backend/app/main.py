import logging
from typing import Dict, Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

try:  # pragma: no cover - executed only when dependency missing
    import itsdangerous  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover
    from .itsdangerous_stub import install_stub

    install_stub()

from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse

from . import models
from .database import SessionLocal, engine

if engine.dialect.name == "postgresql":  # Avoid GeoAlchemy setup on unsupported engines
    models.Base.metadata.create_all(bind=engine)

app = FastAPI()

config = Config(".env")
logger = logging.getLogger(__name__)

allowed_origins = [
    origin.strip()
    for origin in config("ALLOWED_ORIGINS", default="http://localhost:5173").split(",")
    if origin.strip()
]
frontend_redirect_url = config("FRONTEND_REDIRECT_URL", default="http://localhost:5173")
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


DEFAULT_ROLE_NAME = "user"
ALLOWED_ROLES = {"user", "commander", "responder"}


def ensure_role(db: Session, role_name: str) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role:
        return role

    role = models.Role(name=role_name, description=f"{role_name.title()} role")
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def serialize_user(user: models.User) -> Dict[str, Optional[str]]:
    profile_name = user.profile.full_name if user.profile else None
    role_name = None
    if user.roles:
        linked_role = user.roles[0].role
        role_name = linked_role.name if linked_role else None

    return {
        "email": user.email,
        "name": profile_name,
        "role": role_name,
    }


def upsert_user_profile(db: Session, user: models.User, display_name: Optional[str]) -> None:
    fallback_name = display_name or user.email.split("@")[0]
    if user.profile:
        if display_name and user.profile.full_name != display_name:
            user.profile.full_name = display_name
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
    if not user:
        user = models.User(email=email, hashed_password="oauth")
        db.add(user)
        db.flush()
        upsert_user_profile(db, user, name)
        upsert_user_role(db, user, DEFAULT_ROLE_NAME)
        db.commit()
        db.refresh(user)
    else:
        upsert_user_profile(db, user, name)
        if not user.roles:
            upsert_user_role(db, user, DEFAULT_ROLE_NAME)
        db.commit()
        db.refresh(user)

    request.session["user"] = serialize_user(user)

    return RedirectResponse(url=frontend_redirect_url)


@app.get("/api/auth/session")
async def get_session(request: Request):
    user = request.session.get("user")
    if not user:
        return {"user": None}
    return {"user": user}


@app.get("/api/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=frontend_redirect_url)

@app.post("/api/user/role")
def create_or_update_user_role(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    name = data.get("name")
    requested_role = data.get("role") or DEFAULT_ROLE_NAME

    if not email:
        raise HTTPException(400, "Email required")

    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(400, "Invalid role. Must be 'user', 'commander', or 'responder'")

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
        raise HTTPException(400, "Invalid role. Must be 'user', 'commander', or 'responder'")
    
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
