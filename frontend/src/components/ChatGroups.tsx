// src/components/ChatGroups.tsx
import React, { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS } from "../config";
import "./ChatGroups.css";

interface GroupMember { id: string; name: string; email: string; }
type BackendMsg = {
  message_id: string;
  chat_type: "team" | "global";
  team_id: string | null;
  sender_user_id: string;
  content: string;
  created_at: string;
};

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface ChatGroup {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  lastMessage?: { text: string; senderName: string; createdAt: string };
}

interface ChatGroupsProps {
  userId: string;
  refreshTrigger?: number;
}

const ChatGroups: React.FC<ChatGroupsProps> = ({ userId, refreshTrigger }) => {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const baseInputRef = useRef<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup);
      const interval = setInterval(() => fetchMessages(selectedGroup), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.chatGroups, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data);
    } catch (e) {
      setError((e as Error).message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (groupId: string) => {
    try {
      // new backend team messages endpoint
      const response = await fetch(API_ENDPOINTS.teamChatMessages(groupId), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data: BackendMsg[] = await response.json();
      const mapped: ChatMessage[] = data.map((m) => ({
        id: m.message_id,
        senderId: m.sender_user_id,
        senderName: m.sender_user_id, // optionally fetch names separately
        text: m.content,
        createdAt: m.created_at,
      }));
      setMessages(mapped);
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;
    setSending(true);
    try {
      const response = await fetch(API_ENDPOINTS.teamChatMessages(selectedGroup), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newMessage }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      const sent: BackendMsg = await response.json();
      const mapped: ChatMessage = {
        id: sent.message_id,
        senderId: sent.sender_user_id,
        senderName: sent.sender_user_id,
        text: sent.content,
        createdAt: sent.created_at,
      };
      setMessages((p) => [...p, mapped]);
      setNewMessage("");
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  // speech recognition (kept)
  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.interimResults = true;
    recog.continuous = false;

    recog.onstart = () => {
      setRecognizing(true);
      baseInputRef.current = newMessage;
    };

    recog.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) transcript += event.results[i][0].transcript;
      setNewMessage(baseInputRef.current + transcript);
    };

    recog.onerror = () => setRecognizing(false);
    recog.onend = () => { setRecognizing(false); baseInputRef.current = baseInputRef.current; };

    recognitionRef.current = recog;
    return recog;
  };

  const toggleListening = () => {
    const r = initRecognition();
    if (!r) {
      alert("Speech recognition not supported");
      return;
    }
    if (recognizing) { r.stop(); setRecognizing(false); return; }
    try { r.start(); } catch (e) { console.warn("start error", e); }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onstart = null;
          recognitionRef.current.stop?.();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);

  if (loading) return <div className="chat-groups-loading">Loading groups...</div>;
  if (error) return <div className="chat-groups-error">{error}</div>;
  if (groups.length === 0) return (
    <div className="chat-groups-empty">
      <p>No chat groups available yet.</p>
      <p className="empty-subtitle">Groups will appear here once they are created.</p>
    </div>
  );

  return (
    <div className="chat-groups-container">
      <div className="groups-sidebar">
        <h4 className="sidebar-title">Chat Groups</h4>
        <div className="groups-list">
          {groups.map((group) => (
            <div key={group.id} className={`group-item ${selectedGroup === group.id ? "active" : ""}`} onClick={() => setSelectedGroup(group.id)}>
              <div className="group-item-header">
                <div className="group-name">{group.name}</div>
                <div className="group-members-count">{group.members.length} members</div>
              </div>
              {group.lastMessage && (
                <div className="group-last-message">
                  <span className="last-message-sender">{group.lastMessage.senderName}:</span> {group.lastMessage.text.substring(0, 30)}{group.lastMessage.text.length > 30 ? "..." : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {selectedGroupData ? (
          <>
            <div className="chat-header">
              <div>
                <h4 className="chat-group-name">{selectedGroupData.name}</h4>
                <div className="chat-members">{selectedGroupData.members.map(m => m.name).join(", ")}</div>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages"><p>No messages yet. Start the conversation!</p></div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.senderId === userId ? "own-message" : ""}`}>
                    <div className="message-sender">{msg.senderName}</div>
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{new Date(msg.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="message-input-form">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="message-input" disabled={sending} />

              <button type="button" aria-pressed={recognizing} onClick={toggleListening} title={recognizing ? "Stop listening" : "Start speech input"} className={`mic-button ${recognizing ? "listening" : ""}`}>{recognizing ? "🔴" : "🎤"}</button>

              <button type="submit" className="send-button" disabled={sending || !newMessage.trim()}>{sending ? "Sending..." : "Send"}</button>
            </form>
          </>
        ) : (
          <div className="no-group-selected"><p>Select a group to view messages</p></div>
        )}
      </div>
    </div>
  );
};

export default ChatGroups;
