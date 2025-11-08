/**
 * Auth Context Integration Guide
 * This file shows what to modify in AuthContext when switching to your own database.
 */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../api';
import { ROLES, ROLES_PERMISSIONS } from '../utils/roles';

// CHANGE THIS: Update User interface to match your database schema
export interface User {
  id: string;        // Change type if your DB uses numeric IDs
  username: string;  // Or email, or both
  password?: string; // Only for registration/login
  role: string;
  permissions: string[];
  // Add any additional fields your user model has:
  // email?: string;
  // isVerified?: boolean;
  // lastLogin?: Date;
}

// CHANGE THIS: Update context type with any additional auth features you need
interface AuthContextType {
  user: User | null;
  token: string | null;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, role?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  // Add any additional auth methods you need:
  // refreshToken: () => Promise<boolean>;
  // verifyEmail: (token: string) => Promise<boolean>;
  // resetPassword: (email: string) => Promise<boolean>;
}

// CHANGE THESE: Update storage keys if needed
const SESSION_USER_KEY = 'app_user';
const SESSION_TOKEN_KEY = 'app_token';

// CHANGE THIS: If using a real JWT library or different token format
// Currently this creates a mock token - replace with your actual token handling
const createMockToken = (user: Partial<User>) => {
  const payload = {
    id: user.id,
    role: user.role,
    iat: Date.now(),
  };
  return btoa(JSON.stringify(payload));
};

// The rest of the AuthContext implementation would stay largely the same,
// but you would update these key areas:

// 1. Token Management:
/*
const saveSession = (u: User | null, t: string | null) => {
  // CHANGE THIS: Use secure cookie or other storage for tokens
  if (t) {
    // Example: store refresh token in httpOnly cookie
    document.cookie = `refreshToken=${t}; path=/; secure; httpOnly`;
    // Store access token in memory only
    setToken(t);
  }
  // Store minimal user info in session
  if (u) {
    const safeUser = { id: u.id, role: u.role, permissions: u.permissions };
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(safeUser));
  }
};
*/

// 2. Login Process:
/*
const loginWithCredentials = async (username: string, password: string) => {
  // CHANGE THIS: Handle your API's login response format
  const response = await api.login(username, password);
  if (!response || !response.token) return false;

  // Store tokens securely
  saveSession(response.user, response.token);
  
  // Set up automatic token refresh if needed
  setupTokenRefresh(response.refreshToken);
  
  return true;
};
*/

// 3. Signup Process:
/*
const signup = async (username: string, password: string, role = ROLES.CIVILIAN) => {
  // CHANGE THIS: Handle your API's registration response
  const result = await api.register({ 
    username, 
    password, 
    role,
    // Add any additional fields your API needs
    email: username,
    agreedToTerms: true,
  });
  
  if (!result.success) return false;
  
  // Handle email verification if required
  if (result.requiresVerification) {
    // Redirect to verification page or show verification message
    return true;
  }
  
  // Auto-login after signup if allowed
  return loginWithCredentials(username, password);
};
*/

// 4. Permission Checking:
/*
const hasPermission = (permission: string) => {
  // CHANGE THIS: Implement your permission logic
  // Example: Check against JWT claims
  const token = getDecodedToken();
  if (!token) return false;
  return token.permissions.includes(permission);
};
*/