# Making Models Production-Ready (Remove Schema Manipulation)

- Remove the import-time schema reset hook from `backend/app/models/__init__.py` (delete `_kickoff_schema_check()` call and its helpers) so imports never drop/create tables in production.
- Delete or disable test seed wiring in `__init__.py` (remove the `test_init` import/call) and remove `test_init.py` entirely once no longer needed.
- Ensure schema changes are owned by migrations (e.g., Alembic): generate a migration reflecting current models, and apply it to the production database via your CI/CD pipeline.
- Re-enable migration execution at app startup or deployment time if desired (never `create_all`/`drop_all` in runtime code).
- Reintroduce runtime guards: configure the app to refuse to start if pending migrations exist, preventing drift.
- Double-check `.env` for production-safe URLs/credentials and ensure no test data or defaults are present.
