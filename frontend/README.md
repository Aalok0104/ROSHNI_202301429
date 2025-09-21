# ROSHNI Frontend (React TypeScript with Vite + SWC)

The frontend is a React TypeScript app using Vite for fast builds (with SWC compiler), Zustand for state management, Material UI for design, and React Leaflet for maps. It provides role-based UI for disaster management.

## Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   yarn install
   ```

   Core deps include: `zustand`, `@mui/material`, `react-leaflet`, etc.

3. Set up environment variables (create `.env` in `frontend/`):
   ```
   VITE_API_BASE_URL=http://localhost:8000
   # Add more for maps API keys, etc.
   ```

## Running the App
- Run the development server:
  ```
  yarn dev
  ```
  - Access at http://localhost:5173

- Build for production:
  ```
  yarn build
  ```
  - Outputs to `dist/`

## Testing
We use Vitest with React Testing Library for unit/integration tests, and Cypress for E2E.

1. Run unit/integration tests:
   ```
   yarn test
   ```
   - Watch mode: `yarn test --watch`

2. Run E2E tests (if Cypress set up):
   ```
   yarn cypress open  # Or yarn e2e for headless
   ```

3. Linting and formatting:
   - Lint: `yarn lint`
   - Format: `yarn format`

For CI, tests run via GitHub Actions on push/PR.

## Contributing
Contributions are welcome! Follow the project's Forking Workflow:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your-feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request to the main repo's `main` branch.

- **Code Style**: Use ESLint + Prettier. Run `yarn lint` and `yarn format` before PR.
- **Tests**: New components/features must include tests (RTL for UI, Vitest for logic).
- **Issues**: Check GitHub Issues or create one.
- **Reviews**: PRs require at least one approval.

For full guidelines, see the root [CONTRIBUTING.md](../CONTRIBUTING.md).