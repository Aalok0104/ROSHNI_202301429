// src/components/ChatBox.tsx
import React, { useEffect, useRef, useState } from "react";
import { useChat, type UIMessage } from "../../context/ChatContext";

interface ChatBoxProps {
  type: "team" | "global";
  teamId?: string | null;
  currentUserId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ type, teamId = null, currentUserId }) => {
  const { teamMessages, globalMessages, sendChatMessage } = useChat();

  const [input, setInput] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const baseInputRef = useRef<string>("");

  const groupMessages: UIMessage[] =
    type === "global" ? globalMessages : teamId ? teamMessages[teamId] || [] : [];

  const speakMessage = (text: string) => {
    if (!voiceEnabled) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const lastCount = useRef(0);
  useEffect(() => {
    if (!voiceEnabled) {
      lastCount.current = groupMessages.length;
      return;
    }
    if (groupMessages.length > lastCount.current) {
      const m = groupMessages[groupMessages.length - 1];
      if (m.sender_user_id !== currentUserId) {
        speakMessage(`${m.sender} says ${m.text}`);
      }
    }
    lastCount.current = groupMessages.length;
  }, [groupMessages, voiceEnabled, currentUserId]);

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = true;

    recog.onstart = () => {
      setRecognizing(true);
      baseInputRef.current = input;
    };

    recog.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setInput(baseInputRef.current + t);
    };

    recog.onerror = () => setRecognizing(false);
    recog.onend = () => setRecognizing(false);

    recognitionRef.current = recog;
    return recog;
  };

  const toggleListening = () => {
    const recog = initRecognition();
    if (!recog) return alert("Speech recognition unsupported.");
    recognizing ? recog.stop() : recog.start();
  };

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop?.(); } catch {}
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendChatMessage({ type, text: input });
    setInput("");
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%", 
      width: "100%",
      minHeight: 0,
      overflow: "hidden"
    }}>
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        marginBottom: "0.5rem", 
        padding: "0.5rem",
        minHeight: 0,
        background: "rgba(0,0,0,0.2)",
        borderRadius: "0.5rem"
      }}>
        {groupMessages.length === 0 ? (
          <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", padding: "0.5rem" }}>No messages yet.</div>
        ) : (
          groupMessages.map((msg, i) => {
            const isMine = msg.sender_user_id === currentUserId;
            return (
              <div key={msg.id ?? i} style={{ 
                margin: "0.5rem 0", 
                display: "flex", 
                justifyContent: isMine ? "flex-end" : "flex-start" 
              }}>
                <div style={{ 
                  maxWidth: "75%", 
                  padding: "0.5rem 0.75rem", 
                  borderRadius: "0.75rem",
                  background: isMine ? "#3b82f6" : "rgba(255,255,255,0.1)",
                  color: "white"
                }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{msg.sender}</div>
                  <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>{msg.text}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: "0.25rem" }}>
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="checkbox" checked={voiceEnabled} onChange={() => setVoiceEnabled(!voiceEnabled)} />
          <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)" }}>🔊 Read Messages</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={type === "global" ? "Type a global message..." : "Type a team message..."}
          style={{ 
            flex: 1,
            minWidth: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            fontSize: "0.875rem"
          }}
          className="chat-input-field"
        />

        <button
          onClick={toggleListening}
          type="button"
          style={{ 
            flexShrink: 0,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: recognizing ? "#ef4444" : "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "1.25rem"
          }}
        >
          {recognizing ? "🔴" : "🎤"}
        </button>

        <button 
          onClick={handleSend} 
          type="button"
          style={{ 
            flexShrink: 0,
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: "#3b82f6",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#3b82f6"}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
