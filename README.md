# ROSHNI - Disaster Response Coordination Platform

A comprehensive disaster response coordination platform built with Next.js, FastAPI, and PostgreSQL, featuring Google OAuth authentication and role-based access control.

##  Quick Start with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Google Cloud Console](https://console.cloud.google.com/) account for OAuth setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ROSHNI
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000

# Backend Configuration
BACKEND_URL=http://backend:8000

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/roshni_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=roshni_db
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Identity API
4. Go to "APIs & Services" → "Credentials"
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google`
6. Copy Client ID and Client Secret to your `.env` file

### 4. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432

##  Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

##  Authentication & Authorization

### User Roles

- **User**: Default role for new registrations
- **Responder**: Emergency response personnel
- **Commander**: Administrative access to all features

### OAuth Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. After authentication, user is created/retrieved from database
4. Session established with role-based redirect:
   - `commander` → Admin Dashboard
   - `user`/`responder` → User Dashboard

##  API Endpoints

### User Management

```bash
# Get all users
GET /api/users

# Create or get user
POST /api/user/role
{
  "email": "user@example.com",
  "name": "User Name"
}

# Update user role
PUT /api/user/role
{
  "email": "user@example.com",
  "role": "commander"
}
```

##  Testing

### Run All Tests

```bash
# Backend tests
cd backend && python -m pytest

# Frontend tests
cd frontend && npm test
```

### Docker Testing

```bash
# Test backend API
curl http://localhost:8000/api/users

# Test frontend
curl http://localhost:3000/
```

##  Development

### Individual Component Development

- [Frontend Development](./frontend/README.md)
- [Backend Development](./backend/README.md)

### Database Management

```bash
# Access PostgreSQL
docker exec -it roshni-db-1 psql -U postgres -d roshni_db

# View tables
\dt

# View users
SELECT * FROM users;
```

##  Project Structure

```
ROSHNI/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   └── components/      # React components
│   ├── Dockerfile
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py       # Database models
│   │   └── database.py     # Database configuration
│   ├── tests/              # Backend tests
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml       # Docker services configuration
├── .env                     # Environment variables
└── README.md               # This file
```

##  Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Required |
| `NEXTAUTH_SECRET` | NextAuth secret key | Required |
| `NEXTAUTH_URL` | Frontend URL | `http://localhost:3000` |
| `BACKEND_URL` | Backend URL | `http://backend:8000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@db:5432/roshni_db` |

### Docker Services

- **frontend**: Next.js application with hot reload
- **backend**: FastAPI application with auto-reload
- **db**: PostgreSQL database with PostGIS extension

##  Deployment

### Production Deployment

1. Update environment variables for production
2. Configure production database
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Update Google OAuth redirect URIs

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml up -d
```

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Troubleshooting

### Common Issues

1. **Google OAuth Error**: Ensure redirect URI is configured in Google Cloud Console
2. **Database Connection**: Check if PostgreSQL container is running
3. **Port Conflicts**: Ensure ports 3000, 8000, and 5432 are available
4. **Environment Variables**: Verify all required variables are set in `.env`

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs db
```

##  Support

For support and questions, please open an issue in the repository.