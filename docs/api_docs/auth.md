### **Router Specification: `app/routers/auth.py`**

**Purpose:** Manages the OAuth2 flow, session creation, and initial user onboarding checks.
**Dependencies:** `Authlib` (for Google OAuth), `Starlette SessionMiddleware` (for cookies), `SQLAlchemy` (for DB).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/auth.py` or define them at the top of the router file for the coder.

```python
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

# Response for /auth/login (if not auto-redirecting)
class AuthUrlResponse(BaseModel):
    url: str

# Response for /auth/me
class UserSessionResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    role: str  # "civilian", "responder", "commander"
    is_profile_complete: bool # Key flag for frontend redirection
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True
```

-----

### **2. Endpoints**

#### **A. `GET /auth/login`**

  * **Description:** Initiates the OAuth flow.
  * **Input:** None.
  * **Logic:**
    1.  Constructs the Google OAuth authorization URL using `CLIENT_ID` and `REDIRECT_URI`.
    2.  Includes scopes: `openid`, `email`, `profile`.
  * **Returns:** `RedirectResponse` (HTTP 307) to the Google Login Page.

#### **B. `GET /auth/callback`**

  * **Description:** The callback URL hit by Google after successful login. This is the **most complex logic** in the file.
  * **Input:** `request` (Standard FastAPI request object containing the `code` query param).
  * **Logic (Step-by-Step):**
    1.  **Exchange Code:** Use `oauth.google.authorize_access_token(request)` to get the JWT.
    2.  **Parse User Info:** Extract `email`, `sub` (Google ID), `picture`, and `name` from the token.
    3.  **Database Check (The Handshake):**
          * Query `SELECT * FROM users WHERE email = :email`.
    4.  **Branch A: User Exists (Responder or Returning Civilian)**
          * **Action:** If `users.provider_id` is `NULL` (User created by Commander), update it with the Google `sub`.
          * **Action:** Update `users.last_login` timestamp.
    5.  **Branch B: User Does Not Exist (New Civilian)**
          * **Action:** Create a new row in `users`.
              * `role_id`: 1 (Civilian)
              * `email`: from Google
              * `provider_id`: from Google
              * `is_active`: True
          * **Action:** Create a stub row in `user_profiles` with `full_name` from Google.
    6.  **Session Creation:**
          * Set `request.session['user_id'] = str(user.user_id)`.
          * Set `request.session['role'] = role_name`.
    7.  **Redirect:** Return `RedirectResponse` to the Frontend Dashboard URL (e.g., `http://localhost:3000/dashboard`).

#### **C. `POST /auth/logout`**

  * **Description:** Terminates the session.
  * **Input:** `request`.
  * **Logic:** `request.session.clear()`.
  * **Returns:** `{"message": "Logged out successfully"}` (HTTP 200).

#### **D. `GET /auth/me`**

  * **Description:** Called by the Frontend immediately after loading to check "Who am I?" and "Do I need to finish onboarding?".
  * **Input:** `request` (Session Cookie implicitly).
  * **Logic:**
    1.  Check `request.session.get('user_id')`. If missing, return HTTP 401.
    2.  Fetch `User` joined with `UserProfile` from DB.
    3.  **Calculate `is_profile_complete`:**
          * `True` if (`user.phone_number` IS NOT NULL) AND (`profile.date_of_birth` IS NOT NULL).
          * `False` otherwise.
  * **Returns:** `UserSessionResponse` (JSON).

-----

### **3. Critical Logic Implementation Details**

#### **The "Pre-registered Responder" Edge Case**

  * **Scenario:** Commander creates a user `medic@agency.com`. The row exists with no `provider_id`.
  * **Risk:** If your code tries to `INSERT` a new user because it didn't find a `provider_id`, it will fail (Unique Email Constraint).
  * **Fix:** You **must** query by `email` first, not `provider_id`.

#### **Session Configuration (Main.py)**

Ensure your `SessionMiddleware` is configured correctly in `main.py` for this router to work:

```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    SessionMiddleware,
    secret_key="YOUR_SECRET_KEY",
    max_age=86400, # 24 hours
    same_site="lax", 
    https_only=False # Set True in production
)
```
