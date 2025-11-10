# ROSHNI Frontend

This frontend now provides a single, purpose-built login experience that defers all authentication logic to the FastAPI backend. The page renders the ROSHNI mark on the left, a vertical divider, and the Google sign-in action on the right to match the requested layout.

## How it works

- On load the app calls `GET /api/auth/session` (with `credentials: include`) to determine whether a session cookie issued by the backend already exists.
- Selecting **Continue with Google** redirects the browser to the backend at `/api/auth/google/login`, allowing the backend to own the OAuth flow end-to-end.
- When Google redirects back to the backend a signed session cookie is set; the frontend only consumes the resulting session payload and never stores tokens.
- New accounts are automatically provisioned with the **Civilian** role as enforced by the backend.
- When a session exists the UI shows the ROSHNI navbar (logo left, logout right) and three placeholder dashboards (Civilian, Responder, Controller) rendered as blank black canvases until real data is wired up.

## Local development

1. Start the backend (see `../backend/README.md`) so that the `/api/auth/*` routes are available.
2. From this directory install dependencies and start Vite:
   ```bash
   npm install
   npm run dev
   ```
3. (Optional) Point the UI at a different backend by exporting `VITE_API_BASE_URL` before running Vite.

## Testing

Run the Vitest suite to exercise the login view, Google redirect trigger, and session state handling:

```bash
npm run test
```

All obsolete JSON-server files, router stubs, and unused components were removed to keep the project focused on this flow.
