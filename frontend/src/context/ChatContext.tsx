import React, { createContext, useContext, useEffect, useState } from "react";
import { connectWebSocket, sendMessage, subscribeToMessages } from "../services/websocket";

interface Message {
  sender: string;
  text: string;
  groupId: string;
  timestamp: string;
}

interface ChatContextType {
  messages: Message[];
  sendChatMessage: (groupId: string, sender: string, text: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ userId: string; children?: React.ReactNode }> = ({ userId, children }) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    connectWebSocket(userId);
    subscribeToMessages((msg) => setMessages((prev) => [...prev, msg]));
  }, [userId]);

  const sendChatMessage = (groupId: string, sender: string, text: string) => {
    const msg = { groupId, sender, text, timestamp: new Date().toISOString() };
    sendMessage(msg);
  };

  return (
    <ChatContext.Provider value={{ messages, sendChatMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
