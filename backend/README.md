# ROSHNI Backend

A FastAPI backend service for the ROSHNI Disaster Response Coordination Platform, providing user management, role-based access control, and database operations.

## 🚀 Quick Start

### Prerequisites

- [Python](https://www.python.org/) 3.12+
- [PostgreSQL](https://www.postgresql.org/) 13+ (or Docker)
- [pip](https://pip.pypa.io/) or [poetry](https://python-poetry.org/)

### 1. Setup Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
# or
poetry install
```

### 3. Environment Setup

Create a `.env` file in the backend directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roshni_db

# For local development with SQLite
# DATABASE_URL=sqlite:///./disaster_app.db
```

### 4. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL and create database
createdb roshni_db

# Run database migrations
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL with Docker
docker run --name roshni-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=roshni_db \
  -p 5432:5432 \
  -d postgres:15

# Run database migrations
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

### 5. Run Development Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Using the provided script
python -m uvicorn app.main:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Database configuration
│   ├── schemas.py           # Pydantic schemas
│   ├── crud.py              # Database operations
│   └── routers.py           # API route handlers
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Test configuration
│   └── test_main.py         # API tests
├── Dockerfile               # Docker configuration
├── requirements.txt         # Python dependencies
├── pyproject.toml          # Project configuration
└── README.md               # This file
```

## 🔌 API Endpoints

### User Management

#### Create or Get User
```http
POST /api/user/role
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "User Name"
}
```

**Response:**
```json
{
  "role": "user",
  "name": "User Name",
  "email": "user@example.com"
}
```

#### Update User Role
```http
PUT /api/user/role
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "commander"
}
```

**Response:**
```json
{
  "role": "commander",
  "name": "User Name",
  "email": "user@example.com"
}
```

#### Get All Users
```http
GET /api/users
```

**Response:**
```json
[
  {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "User Name",
    "role": "commander"
  }
]
```

### API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🗄️ Database Models

### User Model

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String, default="user")
```

### Supported Roles

- **user**: Default role for new registrations
- **responder**: Emergency response personnel
- **commander**: Administrative access

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_main.py

# Run with verbose output
pytest -v
```

### Test Configuration

Tests use:
- **pytest** for test runner
- **TestClient** for API testing
- **SQLite** for test database
- **pytest-cov** for coverage

### Test Database

Tests automatically create a temporary SQLite database and clean up after completion.

## 🐳 Docker Development

### Build and Run

```bash
# Build Docker image
docker build -t roshni-backend .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/roshni_db \
  roshni-backend
```

### Docker Compose

```bash
# From project root
docker-compose up backend
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./disaster_app.db` |

### Database Configuration

The application supports both PostgreSQL and SQLite:

- **Production**: PostgreSQL with connection pooling
- **Development**: SQLite for local development
- **Testing**: In-memory SQLite

### CORS Configuration

CORS is configured to allow:
- **Origins**: `http://localhost:3000` (frontend)
- **Methods**: All HTTP methods
- **Headers**: All headers
- **Credentials**: Enabled

## 🚀 Production Deployment

### Environment Setup

```bash
# Production environment variables
export DATABASE_URL=postgresql://user:password@host:5432/roshni_db
export ENVIRONMENT=production
```

### Run Production Server

```bash
# Using gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Using uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Production

```bash
# Build production image
docker build -t roshni-backend:prod .

# Run production container
docker run -p 8000:8000 \
  --env-file .env \
  roshni-backend:prod
```

## 📊 Database Operations

### Manual Database Access

```bash
# Access PostgreSQL
psql -h localhost -U postgres -d roshni_db

# View users table
SELECT * FROM users;

# Update user role
UPDATE users SET role = 'commander' WHERE email = 'user@example.com';
```

### Database Migrations

```python
# Create tables
from app.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)

# Drop tables (development only)
Base.metadata.drop_all(bind=engine)
```

## 🛠️ Development Scripts

```bash
# Start development server
uvicorn app.main:app --reload

# Run tests
pytest

# Format code
black app/

# Lint code
flake8 app/

# Type check
mypy app/
```

## 📦 Dependencies

### Core Dependencies

- **FastAPI 0.104+** - Web framework
- **SQLAlchemy 2.0+** - ORM
- **PostgreSQL** - Database
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

### Development Dependencies

- **pytest** - Testing framework
- **pytest-cov** - Coverage
- **httpx** - HTTP client for testing
- **black** - Code formatting
- **flake8** - Linting

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection**: Check `DATABASE_URL` and database server
2. **Port Conflicts**: Ensure port 8000 is available
3. **Dependencies**: Run `pip install -r requirements.txt`
4. **Virtual Environment**: Ensure it's activated

### Debug Mode

```bash
# Run with debug logging
uvicorn app.main:app --reload --log-level debug
```

### Health Check

```bash
# Check if API is running
curl http://localhost:8000/api/users

# Check database connection
python -c "from app.database import SessionLocal; db = SessionLocal(); print('Database connected')"
```

## 📝 API Examples

### Create a User

```bash
curl -X POST http://localhost:8000/api/user/role \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

### Update User Role

```bash
curl -X PUT http://localhost:8000/api/user/role \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "role": "commander"}'
```

### Get All Users

```bash
curl http://localhost:8000/api/users
```

