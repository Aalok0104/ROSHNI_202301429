const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : 'http://localhost:8000';

export const API_BASE_URL = normalizedBaseUrl;
export const WS_BASE = API_BASE_URL.replace(/^http/, 'ws');

export const API_ENDPOINTS = {
  session: `${API_BASE_URL}/auth/me`,
  googleLogin: `${API_BASE_URL}/auth/login`,
  logout: `${API_BASE_URL}/auth/logout`,
  completeRegistration: `${API_BASE_URL}/users/me/onboarding`,
  updateProfile: `${API_BASE_URL}/users/me/profile`,
  updateMedical: `${API_BASE_URL}/users/me/medical`,
  responders: `${API_BASE_URL}/api/responders`,
  chatGroups: `${API_BASE_URL}/api/chat/groups`,
  responderTasks: `${API_BASE_URL}/api/responder/tasks`,

  // NEW CHAT ROUTES (Backend updated)
  teamChatMessages: (teamId: string) => `${API_BASE_URL}/chat/team/${teamId}/messages`,
  globalChatMessages: `${API_BASE_URL}/chat/global/messages`,

  // WebSocket URLs (Auto switches to ws:// or wss://)
  teamChatWS: (teamId: string) =>
    `${API_BASE_URL.replace(/^http/, "ws")}/chat/ws/team/${teamId}`,

  globalChatWS: `${API_BASE_URL.replace(/^http/, "ws")}/chat/ws/global`,
} as const;
