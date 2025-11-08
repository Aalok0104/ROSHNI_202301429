import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../api';
import { ROLES, ROLES_PERMISSIONS } from '../utils/roles';

// Basic User shape as used by the app (password omitted when stored)
export interface User {
  id: string;
  username: string;
  password?: string; // only for login/signup
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, role?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const SESSION_USER_KEY = 'app_user';
const SESSION_TOKEN_KEY = 'app_token';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// Very small helper to create a mock token. It's not secure — it's just a session marker.
const createMockToken = (user: Partial<User>) => {
  const payload = {
    id: user.id,
    role: user.role,
    iat: Date.now(),
  };
  return btoa(JSON.stringify(payload));
};

const parseMockToken = (token: string | null) => {
  if (!token) return null;
  try {
    const decoded = atob(token);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const getInitialUser = (): User | null => {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getInitialToken = (): string | null => sessionStorage.getItem(SESSION_TOKEN_KEY);

  const [user, setUser] = useState<User | null>(getInitialUser());
  const [token, setToken] = useState<string | null>(getInitialToken());

  const saveSession = (u: User | null, t: string | null) => {
    if (u) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(u));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
    if (t) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, t);
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  };

  const loginWithCredentials = async (username: string, password: string) => {
    const res = await api.login(username, password);
    if (!res) return false;

    // Ensure permissions are derived from role if absent
    const permissions = res.permissions && res.permissions.length > 0 ? res.permissions : (ROLES_PERMISSIONS as any)[res.role] || [];
    const safeUser: User = { ...res, permissions } as User;
    const t = createMockToken(safeUser);
    setUser(safeUser);
    setToken(t);
    saveSession(safeUser, t);
    return true;
  };

  const signup = async (username: string, password: string, role = ROLES.CIVILIAN) => {
    // Call API to create user record in json-server
    const newUser = await api.register({ username, password, role, permissions: (ROLES_PERMISSIONS as any)[role] || [] });
    if (!newUser) return false;
    // Auto-login after signup
    const t = createMockToken(newUser as any);
    const safeUser: User = { ...(newUser as any), permissions: (newUser as any).permissions || (ROLES_PERMISSIONS as any)[role] || [] };
    setUser(safeUser);
    setToken(t);
    saveSession(safeUser, t);
    return true;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    saveSession(null, null);
  };

  const hasPermission = (permission: string) => {
    return !!user && user.permissions?.includes(permission);
  };

  const hasRole = (role: string) => {
    return !!user && user.role === role;
  };

  const value: AuthContextType = {
    user,
    token,
    loginWithCredentials,
    signup,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};