# Environment Configuration

## Overview
This project uses different environment files for Docker and local development:

- **`.env`** - Used by Docker Compose (committed to repo with safe defaults)
- **`.env.local`** - Used for local development (gitignored, create from `.env.example`)
- **`.env.example`** - Template file showing all required variables

## Setup Instructions

### For Local Development (npm run dev)

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your local values:
   - `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/roshni_db`
   - `FRONTEND_REDIRECT_URL=http://localhost:5173` (Vite dev server)
   - `VITE_API_BASE_URL=http://localhost:8000`
   - Add your Google OAuth credentials

3. Start services:
   ```bash
   # Backend (from root or backend folder)
   cd backend
   uvicorn app.main:app --reload

   # Frontend (from frontend folder)
   cd frontend
   npm run dev
   ```

### For Docker

1. Ensure `.env` has Docker-appropriate values (already configured):
   - `DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/roshni_db` (uses Docker service name `db`)
   - `FRONTEND_REDIRECT_URL=http://localhost:3000` (nginx container port)
   - `VITE_API_BASE_URL=http://localhost:8000`

2. Start all services:
   ```bash
   docker compose up --build -d
   ```

## How It Works

### Frontend
- **Local Dev**: Vite loads variables from `root/.env.local` (via `envDir` config in `vite.config.ts`)
- **Docker**: Build args pass `VITE_API_BASE_URL` from `root/.env` during image build

### Backend
- **Local Dev**: Python loads from `root/.env.local` (if present) via `python-dotenv`
- **Docker**: Docker Compose passes all vars from `root/.env` to the container

## Important Variables

| Variable | Docker (.env) | Local (.env.local) | Description |
|----------|---------------|-------------------|-------------|
| `DATABASE_URL` | `@db:5432` | `@localhost:5432` | PostgreSQL connection |
| `FRONTEND_REDIRECT_URL` | `localhost:3000` | `localhost:5173` | After OAuth redirect |
| `VITE_API_BASE_URL` | `localhost:8000` | `localhost:8000` | Backend API endpoint |
| `ALLOWED_ORIGINS` | `localhost:3000` | `localhost:5173` | CORS origins |

## Security Notes

- **Never commit `.env.local`** - Contains sensitive credentials
- `.env` can be committed with Docker defaults
- Update `.env.example` when adding new required variables
