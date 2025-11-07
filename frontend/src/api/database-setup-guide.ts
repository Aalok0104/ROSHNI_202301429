/**
 * Database Schema and Environment Setup Guide
 * This file provides examples of database schema and environment configuration when moving away from json-server.
 */

// 1. Example Database Schema (for reference)
/*
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- User Permissions (Many-to-Many)
CREATE TABLE user_permissions (
    user_id INTEGER REFERENCES users(id),
    permission_id INTEGER REFERENCES permissions(id),
    PRIMARY KEY (user_id, permission_id)
);

-- Refresh Tokens Table (if implementing token refresh)
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// 2. Environment Variables (.env file)
/*
# Server Configuration
SERVER_PORT=8000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (if implementing verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
*/

// 3. Example API Routes (for your backend)
/*
auth.routes.ts:

POST /api/auth/register
- Accepts: { username, email, password, role }
- Returns: { user, token }

POST /api/auth/login
- Accepts: { username, password }
- Returns: { user, token, refreshToken }

POST /api/auth/refresh
- Accepts: { refreshToken }
- Returns: { token }

GET /api/users/me
- Headers: Authorization: Bearer <token>
- Returns: { user }

POST /api/auth/verify-email
- Accepts: { token }
- Returns: { success }

POST /api/auth/reset-password
- Accepts: { email }
- Returns: { success }
*/

// 4. Frontend Environment (.env.local)
/*
VITE_API_URL=http://localhost:8000/api
VITE_DEFAULT_ROLE=civilian
VITE_TOKEN_STORAGE_KEY=app_token
VITE_USER_STORAGE_KEY=app_user
*/

// 5. API Error Handling
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

// Example error responses from your API:
const ERROR_RESPONSES = {
  INVALID_CREDENTIALS: {
    statusCode: 401,
    message: 'Invalid username or password'
  },
  EMAIL_NOT_VERIFIED: {
    statusCode: 403,
    message: 'Please verify your email before logging in'
  },
  VALIDATION_ERROR: {
    statusCode: 400,
    message: 'Validation failed',
    errors: {
      username: ['Username is already taken'],
      email: ['Invalid email format']
    }
  }
};

// 6. Security Considerations
/*
When implementing your own backend:

1. Password Security:
   - NEVER store plain passwords
   - Use bcrypt or Argon2 for password hashing
   - Implement password complexity requirements

2. Token Security:
   - Use httpOnly cookies for refresh tokens
   - Keep access tokens short-lived
   - Implement token rotation
   - Add token revocation capability

3. API Security:
   - Implement rate limiting
   - Add request validation
   - Use HTTPS only
   - Implement CORS properly
   - Add API key for external services

4. Data Validation:
   - Validate all inputs
   - Sanitize data before storage
   - Implement request size limits
   - Add SQL injection protection

5. Error Handling:
   - Don't expose internal errors
   - Log errors securely
   - Return appropriate status codes
   - Include request IDs for tracking
*/

// 7. Migration Steps
/*
To migrate from json-server to your database:

1. Setup:
   - Create database and tables
   - Set up your backend server
   - Configure environment variables
   - Update frontend API_BASE_URL

2. Data Migration:
   - Export users from db.json
   - Transform data to match new schema
   - Import into your database
   - Update user passwords with proper hashing

3. Frontend Updates:
   - Update API endpoints in api/index.ts
   - Update AuthContext token handling
   - Add error handling for new API responses
   - Update types to match API responses

4. Testing:
   - Test registration flow
   - Test login/logout
   - Test permission checks
   - Test token refresh
   - Test error scenarios
*/