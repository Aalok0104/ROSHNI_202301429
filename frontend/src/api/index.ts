import axios from 'axios';
import type { User } from '../context/AuthContext'; // We will create this next

// JSON Server base URL
const API_BASE_URL = 'http://localhost:3001';

export interface Product {
  id: string;
  name: string;
  price: number;
}

/**
 * Fetches a user from the mock API based on credentials.
 */
export const login = async (
  username: string,
  password: string
): Promise<User | null> => {
  try {
    // Configure axios with proper headers
    const config = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // First, try to get the user by username
    const response = await axios.get<User[]>(`${API_BASE_URL}/users?username=${username}`, config);
    console.log('Server response:', response.data);

    if (response.data && response.data.length > 0) {
      const user = response.data[0];
      // Check password match
      if (user.password === password) {
        // Remove password from user object before returning
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
    }
    console.log('No matching user found or password incorrect');
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Login failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      console.error('Login failed:', error);
    }
    return null;
  }
};



/**
 * Registers a new user in the mock API (JSON Server). Returns the created user (without password) or null on failure.
 */
export const register = async (user: Partial<User>): Promise<User | null> => {
  try {
    const response = await axios.post<User>(`${API_BASE_URL}/users`, user, {
      headers: { 'Content-Type': 'application/json' },
    });
    const { password: _, ...userWithoutPassword } = response.data as any;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Register failed:', error);
    return null;
  }
};