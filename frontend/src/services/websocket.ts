// src/services/websocket.ts
import { WS_BASE } from "../config";

let teamSocket: WebSocket | null = null;
let globalSocket: WebSocket | null = null;

export const connectTeamSocket = (
  disasterId: string,
  teamId: string,
  userId: string,
  onMessage: (m: any) => void,
  onOpen?: () => void,
  onClose?: () => void
) => {
  if (!teamId || !disasterId) return null;

  // close existing
  if (teamSocket) {
    try { teamSocket.close(); } catch {}
    teamSocket = null;
  }

  const url = `${WS_BASE}/chat/ws/${disasterId}?team_id=${teamId}&user_id=${userId}`;
  teamSocket = new WebSocket(url);

  teamSocket.onopen = () => {
    onOpen?.();
    console.log("✅ team socket connected", teamId);
  };

  teamSocket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (e) {
      console.warn("Invalid team ws message", ev.data);
    }
  };

  teamSocket.onclose = () => {
    onClose?.();
    console.log("❌ team socket closed", teamId);
    teamSocket = null;
  };

  teamSocket.onerror = (e) => {
    console.error("Team socket error", e);
  };

  return () => {
    if (teamSocket) {
      try { teamSocket.close(); } catch {}
      teamSocket = null;
    }
  };
};

export const sendTeamMessage = (content: string) => {
  if (!teamSocket || teamSocket.readyState !== WebSocket.OPEN) return false;
  try {
    teamSocket.send(content);
    return true;
  } catch (e) {
    console.error("sendTeamMessage failed", e);
    return false;
  }
};

export const connectGlobalSocket = (
  disasterId: string,
  userId: string,
  onMessage: (m: any) => void,
  onOpen?: () => void,
  onClose?: () => void
) => {
  if (!disasterId) return null;
  
  if (globalSocket) {
    try { globalSocket.close(); } catch {}
    globalSocket = null;
  }

  const url = `${WS_BASE}/chat/ws/global/${disasterId}?user_id=${userId}`;
  globalSocket = new WebSocket(url);

  globalSocket.onopen = () => {
    onOpen?.();
    console.log("✅ global socket connected");
  };

  globalSocket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (e) {
      console.warn("Invalid global ws message", ev.data);
    }
  };

  globalSocket.onclose = () => {
    onClose?.();
    console.log("❌ global socket closed");
    globalSocket = null;
  };

  globalSocket.onerror = (e) => {
    console.error("Global socket error", e);
  };

  return () => {
    if (globalSocket) {
      try { globalSocket.close(); } catch {}
      globalSocket = null;
    }
  };
};

export const sendGlobalMessage = (content: string) => {
  if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return false;
  try {
    // backend expects plain text payload (same as team socket)
    globalSocket.send(content);
    return true;
  } catch (e) {
    console.error("sendGlobalMessage failed", e);
    return false;
  }
};
