/**
 * Database Integration Guide
 * This file shows the key changes needed when switching from json-server to your own database.
 */

import axios from 'axios';
import type { User } from '../context/AuthContext';

// CHANGE THIS: Replace with your API server URL
// Example: http://localhost:8000/api or https://your-domain.com/api
const API_BASE_URL = 'http://localhost:3001';

// CHANGE THIS: Add your API's authentication token header (if needed)
// Example: const AUTH_TOKEN_HEADER = 'Bearer';

// CHANGE THIS: If your API uses different user/auth types, define them here
// Example:
/*
interface ApiUser {
  id: number;          // If your DB uses numeric IDs
  email: string;       // If you have additional fields
  name: string;
  role: string;
  isVerified: boolean;
}

interface LoginResponse {
  user: ApiUser;
  token: string;      // If your API returns auth tokens
  refreshToken?: string;
}
*/

/**
 * Fetches a user from the mock API based on credentials.
 * 
 * TODO: When switching to your database:
 * 1. Change the endpoint to match your auth API (e.g., /api/auth/login)
 * 2. Adjust the request body format to match your API expectations
 * 3. Update response handling to match your API's user object structure
 * 4. Add proper error handling for your API's error responses
 * 5. Consider adding token handling if your API uses JWT or other auth tokens
 */
export const login = async (
  username: string,
  password: string
): Promise<User | null> => {
  try {
    // CHANGE THIS: Update headers based on your API requirements
    const config = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        // Add any additional headers your API needs:
        // 'Authorization': `Bearer ${token}`,
        // 'Api-Key': 'your-api-key'
      }
    };

    // CHANGE THIS: Replace with your login endpoint
    // Example: const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
    const response = await axios.get<User[]>(`${API_BASE_URL}/users?username=${username}`, config);
    
    // CHANGE THIS: Update this logic to match your API's response format
    // Your API might return: { user: {...}, token: "..." }
    if (response.data && response.data.length > 0) {
      const user = response.data[0];
      if (user.password === password) {
        // CHANGE THIS: Your API should never return passwords
        // You might need to transform the API response to match the User type
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
    }
    return null;
  } catch (error) {
    // CHANGE THIS: Add proper error handling for your API
    // Example: Handle 401 (unauthorized), 403 (forbidden), etc.
    console.error('Login failed:', error);
    return null;
  }
};

/**
 * Registers a new user in the API.
 * 
 * TODO: When switching to your database:
 * 1. Change the endpoint to your registration endpoint (e.g., /api/auth/register)
 * 2. Update the request body format to match your API
 * 3. Handle your API's specific response format
 * 4. Add any additional fields your registration requires
 * 5. Consider handling email verification if your API requires it
 */
export const register = async (user: Partial<User>): Promise<User | null> => {
  try {
    // CHANGE THIS: Replace with your registration endpoint and data format
    // Example: 
    /*
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: user.username,
      password: user.password,
      role: user.role,
      // Add any additional fields your API needs
    }, {
      headers: { 
        'Content-Type': 'application/json',
        // Add any API keys or other headers needed
      }
    });
    */
    const response = await axios.post<User>(`${API_BASE_URL}/users`, user, {
      headers: { 'Content-Type': 'application/json' },
    });

    // CHANGE THIS: Transform your API's response to match the User type
    const { password: _, ...userWithoutPassword } = response.data as any;
    return userWithoutPassword as User;
  } catch (error) {
    // CHANGE THIS: Add proper error handling for your API
    console.error('Register failed:', error);
    return null;
  }
};

// CHANGE THIS: Add any additional API functions your backend provides
// Examples:
/*
export const verifyEmail = async (token: string): Promise<boolean> => {
  try {
    await axios.post(`${API_BASE_URL}/auth/verify-email`, { token });
    return true;
  } catch (error) {
    return false;
  }
};

export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    await axios.post(`${API_BASE_URL}/auth/reset-password`, { email });
    return true;
  } catch (error) {
    return false;
  }
};

export const refreshAuthToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    return response.data.token;
  } catch (error) {
    return null;
  }
};
*/