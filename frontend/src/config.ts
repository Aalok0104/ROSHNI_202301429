const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : 'http://localhost:8000';

export const API_BASE_URL = normalizedBaseUrl;

export const API_ENDPOINTS = {
  session: `${API_BASE_URL}/api/auth/session`,
  googleLogin: `${API_BASE_URL}/api/auth/google/login`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  completeRegistration: `${API_BASE_URL}/api/auth/complete-registration`,
  responders: `${API_BASE_URL}/api/responders`,
  chatGroups: `${API_BASE_URL}/api/chat/groups`,
} as const;
