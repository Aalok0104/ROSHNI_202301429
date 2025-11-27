// src/context/ChatContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  connectTeamSocket,
  connectGlobalSocket,
  sendTeamMessage,
  sendGlobalMessage,
} from "../services/websocket";
import { API_ENDPOINTS } from "../config";

type Msg = {
  message_id: string;
  disaster_id: string;
  team_id: string | null;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  is_global: boolean;
  created_at: string;
};

export type UIMessage = {
  id: string;
  groupId: string | null;
  sender: string;
  sender_user_id: string;
  text: string;
  timestamp: string;
};

interface ChatContextType {
  teamMessages: Record<string, UIMessage[]>;
  globalMessages: UIMessage[];
  connectToTeam: (disasterId: string, teamId: string, userId: string) => void;
  disconnectTeam: () => void;
  connectToGlobal: (disasterId: string, userId: string) => void;
  disconnectGlobal: () => void;
  sendChatMessage: (opts: { type: "team" | "global"; text: string }) => Promise<boolean>;
  fetchTeamHistory: (teamId: string) => Promise<void>;
  fetchGlobalHistory: () => Promise<void>;
  currentTeamId: string | null;
  disasterId: string | null;
  userId: string | null;
  setDisasterId: (id: string | null) => void;
  setUserId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [teamMessages, setTeamMessages] = useState<Record<string, UIMessage[]>>({});
  const [globalMessages, setGlobalMessages] = useState<UIMessage[]>([]);  
  const [disasterId, setDisasterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const currentTeamRef = useRef<string | null>(null);

  const cleanupTeamRef = useRef<(() => void) | null>(null);
  const cleanupGlobalRef = useRef<(() => void) | null>(null);

  const handleIncoming = (raw: Msg) => {
    const ui: UIMessage = {
      id: raw.message_id,
      groupId: raw.team_id,
      sender: raw.sender_name || raw.sender_user_id,
      sender_user_id: raw.sender_user_id,
      text: raw.message_text,
      timestamp: raw.created_at,
    };

    if (raw.is_global) {
      setGlobalMessages((prev) => [...prev, ui]);
    } else {
      const tid = raw.team_id ?? currentTeamRef.current ?? "unknown";
      setTeamMessages((prev) => ({
        ...prev,
        [tid]: [...(prev[tid] || []), ui],
      }));
    }
  };

  const connectToTeam = (disaster_id: string, teamId: string, user_id: string) => {
    disconnectTeam();
    if (!teamId || !disaster_id || !user_id) {
      currentTeamRef.current = null;
      return;
    }
    currentTeamRef.current = teamId;

    const maybeCleanup = connectTeamSocket(
      disaster_id,
      teamId,
      user_id,
      (m: any) => { handleIncoming(m as Msg); },
      () => {},
      () => {}
    );
    cleanupTeamRef.current = maybeCleanup || null;
  };

  const disconnectTeam = () => {
    if (cleanupTeamRef.current) {
      try { cleanupTeamRef.current(); } catch {}
      cleanupTeamRef.current = null;
    }
    currentTeamRef.current = null;
  };

  const connectToGlobal = (disaster_id: string, user_id: string) => {
    disconnectGlobal();
    if (!disaster_id || !user_id) return;
    
    const maybeCleanup = connectGlobalSocket(
      disaster_id,
      user_id,
      (m: any) => handleIncoming(m as Msg),
      () => {},
      () => {}
    );
    cleanupGlobalRef.current = maybeCleanup || null;
  };

  const disconnectGlobal = () => {
    if (cleanupGlobalRef.current) {
      try { cleanupGlobalRef.current(); } catch {}
      cleanupGlobalRef.current = null;
    }
  };

  const sendChatMessage = async ({ type, text }: { type: "team" | "global"; text: string }) => {
    return type === "team" ? sendTeamMessage(text) : sendGlobalMessage(text);
  };

  const fetchTeamHistory = async (teamId: string) => {
    if (!disasterId) return;
    try {
      const url = `${API_ENDPOINTS.session.replace(/\/auth\/me$/, '')}/chat/${disasterId}/history?scope=team&team_id=${teamId}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      const data: Msg[] = await res.json();
      const ui = data.map((raw) => ({
        id: raw.message_id,
        groupId: raw.team_id,
        sender: raw.sender_name || raw.sender_user_id,
        sender_user_id: raw.sender_user_id,
        text: raw.message_text,
        timestamp: raw.created_at,
      }));
      setTeamMessages((prev) => ({ ...prev, [teamId]: ui.reverse() }));
    } catch (e) {
      console.warn('fetchTeamHistory failed', e);
    }
  };

  const fetchGlobalHistory = async () => {
    if (!disasterId) return;
    try {
      const url = `${API_ENDPOINTS.session.replace(/\/auth\/me$/, '')}/chat/${disasterId}/history?scope=global`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      const data: Msg[] = await res.json();
      const ui = data.map((raw) => ({
        id: raw.message_id,
        groupId: raw.team_id,
        sender: raw.sender_name || raw.sender_user_id,
        sender_user_id: raw.sender_user_id,
        text: raw.message_text,
        timestamp: raw.created_at,
      }));
      setGlobalMessages(ui.reverse());
    } catch (e) {
      console.warn('fetchGlobalHistory failed', e);
    }
  };

  useEffect(() => {
    return () => {
      disconnectTeam();
      disconnectGlobal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ChatContext.Provider
      value={{
        teamMessages,
        globalMessages,
        connectToTeam,
        disconnectTeam,
        connectToGlobal,
        disconnectGlobal,
        sendChatMessage,
        fetchTeamHistory,
        fetchGlobalHistory,
        currentTeamId: currentTeamRef.current,
        disasterId,
        userId,
        setDisasterId,
        setUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
