from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager

from app.models import news_models
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.routers import auth
from app.models.user_family_models import Role  # Import Role for seeding
from app.routers import auth, users, responders, incidents, disasters, chat, surveys, reports, logs, tasks, disaster_news

# --- Lifecycle: Seed Roles on Startup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create Tables (Dev only - use Alembic in Prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 2. Seed Roles
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(Role))
        roles = result.scalars().all()
        
        if not roles:
            # Seed standard roles
            role_data = [
                Role(role_id=1, name="civilian", description="Standard user"),
                Role(role_id=2, name="responder", description="Emergency personnel"),
                Role(role_id=3, name="commander", description="System administrator")
            ]
            session.add_all(role_data)
            await session.commit()
            print("✅ Roles seeded successfully.")
            
    yield
    # Shutdown logic if needed

app = FastAPI(title="ROSHNI API Backend", lifespan=lifespan)

# --- Middleware ---
# CORS - Allow frontend to call backend from different origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Docker frontend
        settings.FRONTEND_REDIRECT_URL.replace("http://", "").replace("https://", "").split("/")[0],  # Dynamic from env
    ],
    allow_credentials=True,  # Required for cookies/session
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Session Management
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=86400, # 24 hours
    same_site="lax", 
    https_only=False # Set True in production
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(responders.router)
app.include_router(responders.responder_router)
app.include_router(incidents.router)
app.include_router(disasters.router)
app.include_router(chat.router)
app.include_router(surveys.router)
app.include_router(reports.router)
app.include_router(logs.router)
app.include_router(tasks.router)
app.include_router(disaster_news.router)

@app.get("/")
def root():
    return {"message": "ROSHNI API Documentation"}
