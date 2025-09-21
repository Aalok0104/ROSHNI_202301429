import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app, get_db
from app.models import Base, User

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    # Create tables
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    # Clean up
    Base.metadata.drop_all(bind=engine)

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 404  # No root endpoint defined

def test_get_or_create_user_new_user(client):
    """Test creating a new user"""
    user_data = {
        "email": "test@example.com",
        "name": "Test User"
    }
    response = client.post("/api/user/role", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert data["role"] == "user"

def test_get_or_create_user_existing_user(client):
    """Test getting an existing user"""
    # First create a user
    user_data = {
        "email": "existing@example.com",
        "name": "Existing User"
    }
    client.post("/api/user/role", json=user_data)
    
    # Then get the same user
    response = client.post("/api/user/role", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "existing@example.com"
    assert data["name"] == "Existing User"
    assert data["role"] == "user"

def test_get_or_create_user_missing_email(client):
    """Test creating user without email"""
    user_data = {
        "name": "Test User"
    }
    response = client.post("/api/user/role", json=user_data)
    assert response.status_code == 400

def test_update_user_role(client):
    """Test updating user role"""
    # First create a user
    user_data = {
        "email": "update@example.com",
        "name": "Update User"
    }
    client.post("/api/user/role", json=user_data)
    
    # Update role to commander
    update_data = {
        "email": "update@example.com",
        "role": "commander"
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "commander"
    assert data["email"] == "update@example.com"

def test_update_user_role_invalid_role(client):
    """Test updating user role with invalid role"""
    # First create a user
    user_data = {
        "email": "invalid@example.com",
        "name": "Invalid User"
    }
    client.post("/api/user/role", json=user_data)
    
    # Try to update with invalid role
    update_data = {
        "email": "invalid@example.com",
        "role": "invalid_role"
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 400

def test_update_user_role_nonexistent_user(client):
    """Test updating role for non-existent user"""
    update_data = {
        "email": "nonexistent@example.com",
        "role": "commander"
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 404

def test_update_user_role_missing_data(client):
    """Test updating user role with missing data"""
    update_data = {
        "email": "test@example.com"
        # Missing role
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 400

def test_get_all_users(client):
    """Test getting all users"""
    # Create some test users
    users = [
        {"email": "user1@example.com", "name": "User 1"},
        {"email": "user2@example.com", "name": "User 2"},
        {"email": "user3@example.com", "name": "User 3"}
    ]
    
    for user_data in users:
        client.post("/api/user/role", json=user_data)
    
    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # At least 3 users should exist
    
    # Check that all created users are in the response
    emails = [user["email"] for user in data]
    for user_data in users:
        assert user_data["email"] in emails

def test_user_role_workflow(client):
    """Test complete user role workflow"""
    # Create user
    user_data = {
        "email": "workflow@example.com",
        "name": "Workflow User"
    }
    response = client.post("/api/user/role", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "user"
    
    # Update to responder
    update_data = {
        "email": "workflow@example.com",
        "role": "responder"
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "responder"
    
    # Update to commander
    update_data = {
        "email": "workflow@example.com",
        "role": "commander"
    }
    response = client.put("/api/user/role", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "commander"
    
    # Verify in get all users
    response = client.get("/api/users")
    assert response.status_code == 200
    users = response.json()
    workflow_user = next((u for u in users if u["email"] == "workflow@example.com"), None)
    assert workflow_user is not None
    assert workflow_user["role"] == "commander"