from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .models import User, Base
from .database import SessionLocal, engine
import uuid
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Retry database connection
def create_tables_with_retry(max_retries=5, delay=2):
    for attempt in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            return
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed to create tables: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                logger.error("Failed to create tables after all retries")
                raise

# Create tables with retry
create_tables_with_retry()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/user/role")
def get_or_create_user(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    name = data.get("name")
    if not email:
        raise HTTPException(400, "Email required")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=name, role="user")  # Assign default role
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {"role": user.role, "name": user.name, "email": user.email}

@app.put("/api/user/role")
def update_user_role(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    new_role = data.get("role")
    
    if not email or not new_role:
        raise HTTPException(400, "Email and role required")
    
    if new_role not in ["user", "commander", "responder"]:
        raise HTTPException(400, "Invalid role. Must be 'user', 'commander', or 'responder'")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    
    return {"role": user.role, "name": user.name, "email": user.email}

@app.get("/api/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": user.id, "email": user.email, "name": user.name, "role": user.role} for user in users]