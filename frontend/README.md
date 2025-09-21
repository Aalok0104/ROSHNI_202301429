# ROSHNI Frontend

A Next.js 15 frontend application for the ROSHNI Disaster Response Coordination Platform, featuring Google OAuth authentication and role-based dashboards.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Google Cloud Console](https://console.cloud.google.com/) account

### 1. Install Dependencies

```bash
cd frontend
yarn install
# or
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000

# Backend Configuration
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Database Configuration (for API routes)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roshni_db
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID with redirect URI: `http://localhost:3000/api/auth/google`
3. Copy credentials to `.env.local`

### 4. Run Development Server

```bash
yarn dev
# or
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── auth/          # Authentication endpoints
│   │   ├── admin-dashboard/   # Commander dashboard
│   │   ├── user-dashboard/    # User/Responder dashboard
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Login page
│   ├── components/            # React components
│   │   └── ClientSessionProvider.tsx
│   └── stores/                # State management
├── public/                    # Static assets
├── Dockerfile                 # Docker configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies
└── jest.config.js            # Test configuration
```

## 🔐 Authentication Flow

### Custom Google OAuth Implementation

The application uses a custom Google OAuth implementation instead of NextAuth:

1. **Login Page** (`/`): Displays Google sign-in button
2. **OAuth Redirect** (`/api/auth/google`): Handles Google OAuth flow
3. **Session Management** (`/api/auth/session`): Manages user sessions
4. **Logout** (`/api/auth/logout`): Clears user session

### API Routes

#### `/api/auth/google`
- **GET**: Initiates Google OAuth flow or handles callback
- Redirects to Google OAuth or processes authentication

#### `/api/auth/session`
- **GET**: Returns current user session data
- Returns `{ user: null }` if not authenticated

#### `/api/auth/logout`
- **POST**: Clears user session cookie
- Returns success message

## 🎨 UI Components

### Pages

#### Login Page (`/`)
- Greyish-black background
- App logo on the left
- Vertical divider
- Google sign-in button on the right

#### User Dashboard (`/user-dashboard`)
- Black background with black navbar
- App logo in top-left
- "Hello, {Role}" greeting in center
- Logout button in top-right

#### Admin Dashboard (`/admin-dashboard`)
- Same design as user dashboard
- Only accessible to users with "commander" role
- Shows "Hello, Commander"

### Components

#### ClientSessionProvider
- Wraps the app with Material-UI theme
- Provides client-side context

## 🧪 Testing

### Run Tests

```bash
# Run all tests
yarn test
# or
npm test

# Run tests in watch mode
yarn test --watch
# or
npm test --watch

# Run tests with coverage
yarn test --coverage
# or
npm test --coverage
```

### Test Files

- `src/app/page.test.tsx` - Login page tests
- `src/app/user-dashboard/page.test.tsx` - User dashboard tests
- `src/app/admin-dashboard/page.test.tsx` - Admin dashboard tests

### Test Configuration

Tests use:
- **Jest** for test runner
- **@testing-library/react** for component testing
- **jsdom** for DOM simulation

## 🐳 Docker Development

### Build and Run

```bash
# Build Docker image
docker build -t roshni-frontend .

# Run container
docker run -p 3000:3000 \
  -e GOOGLE_CLIENT_ID=your-client-id \
  -e GOOGLE_CLIENT_SECRET=your-client-secret \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  roshni-frontend
```

### Docker Compose

```bash
# From project root
docker-compose up frontend
```

## 🔧 Configuration

### Next.js Configuration

The app uses Next.js 15 with:
- **App Router** for routing
- **Turbopack** for fast development builds
- **Image optimization** for external images
- **Standalone output** for Docker

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `NEXTAUTH_SECRET` | Session encryption key | Yes |
| `NEXTAUTH_URL` | Frontend URL | Yes |
| `BACKEND_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | Public backend URL | Yes |
| `DATABASE_URL` | Database connection string | Yes |

## 🚀 Production Build

### Build for Production

```bash
# Build the application
yarn build
# or
npm run build

# Start production server
yarn start
# or
npm start
```

### Docker Production

```bash
# Build production image
docker build -t roshni-frontend:prod .

# Run production container
docker run -p 3000:3000 \
  --env-file .env.local \
  roshni-frontend:prod
```

## 🛠️ Development Scripts

```bash
# Development server
yarn dev

# Build application
yarn build

# Start production server
yarn start

# Run tests
yarn test

# Lint code
yarn lint

# Type check
yarn type-check
```

## 📦 Dependencies

### Core Dependencies

- **Next.js 15.5.3** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI** - UI components

### Development Dependencies

- **Jest** - Testing framework
- **@testing-library/react** - Component testing
- **ESLint** - Code linting
- **TypeScript** - Type checking

## 🔍 Troubleshooting

### Common Issues

1. **Google OAuth Error**: Check redirect URI configuration
2. **Backend Connection**: Verify `BACKEND_URL` is correct
3. **Environment Variables**: Ensure all required variables are set
4. **Port Conflicts**: Check if port 3000 is available

### Debug Mode

```bash
# Run with debug logging
DEBUG=* yarn dev
```

### Logs

```bash
# View build logs
yarn build --verbose

# View test logs
yarn test --verbose
```

## 📝 API Integration

### Backend Communication

The frontend communicates with the backend through:

1. **User Creation/Retrieval**: `POST /api/user/role`
2. **Role Updates**: `PUT /api/user/role`
3. **User List**: `GET /api/users`

### Error Handling

- Network errors are caught and logged
- OAuth errors redirect to login page
- Session errors clear cookies and redirect
