const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : 'http://localhost:8000';

export const API_BASE_URL = normalizedBaseUrl;

export const API_ENDPOINTS = {
  session: `${API_BASE_URL}/auth/me`,
  googleLogin: `${API_BASE_URL}/auth/login`,
  logout: `${API_BASE_URL}/auth/logout`,
  completeRegistration: `${API_BASE_URL}/users/me/onboarding`,
  updateProfile: `${API_BASE_URL}/users/me/profile`,
  updateMedical: `${API_BASE_URL}/users/me/medical`,
  responders: `${API_BASE_URL}/api/responders`,
  chatGroups: `${API_BASE_URL}/api/chat/groups`,
} as const;
