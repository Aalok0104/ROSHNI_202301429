# ROSHNI Backend (FastAPI)

The backend of the ROSHNI disaster management app handles API endpoints, database interactions with PostgreSQL/PostGIS via SQLAlchemy, role-based access control, and integration with AI models for predictive analytics.

## Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

   If `requirements.txt` is outdated, install manually:
   ```
   pip install fastapi uvicorn sqlalchemy geoalchemy2 psycopg2-binary pydantic-settings pytest pytest-asyncio httpx black flake8
   pip freeze > requirements.txt
   ```

4. Set up environment variables (create `.env` in `backend/`):
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/disaster_db
   # Add secrets for AI models, JWT, etc., as needed
   ```

## Running the App
- Run the development server:
  ```
  uvicorn app.main:app --reload
  ```
  - Access at http://localhost:8000
  - API docs at http://localhost:8000/docs (Swagger UI)

- For production-like run (no reload):
  ```
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```

## Testing
We use Pytest for unit and integration tests. Tests cover API endpoints, CRUD operations, and database interactions.

1. Run all tests:
   ```
   pytest
   ```

2. Run with coverage:
   ```
   pip install pytest-cov  # If not installed
   pytest --cov=app
   ```

3. Integration tests: Ensure the database is running (e.g., via Docker). Tests use `httpx` for async API calls.

4. Linting and formatting:
   - Lint: `flake8 .`
   - Format: `black .`

For CI, tests run automatically via GitHub Actions on push/PR.

## Contributing
Contributions are welcome! Follow the project's Forking Workflow:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your-feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request to the main repo's `main` branch.

- **Code Style**: Use Black for formatting and Flake8 for linting. Run checks before PR.
- **Tests**: All new features must include tests. Aim for >80% coverage.
- **Issues**: Check GitHub Issues for open tasks or create one.
- **Reviews**: PRs require at least one approval.

For full guidelines, see the root [CONTRIBUTING.md](../CONTRIBUTING.md).