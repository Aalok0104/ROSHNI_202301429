import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";

interface ChatBoxProps {
  groupId: string;
  sender: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ groupId, sender }) => {
  const { messages, sendChatMessage } = useChat();
  const [input, setInput] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const baseInputRef = useRef<string>("");

  const groupMessages = messages.filter((m) => m.groupId === groupId);

  const handleSend = () => {
    if (input.trim()) {
      sendChatMessage(groupId, sender, input);
      setInput("");
    }
  };

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.interimResults = true;
    recog.continuous = false;

    recog.onstart = () => {
      setRecognizing(true);
      baseInputRef.current = input;
    };

    recog.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(baseInputRef.current + transcript);
    };

    recog.onerror = () => {
      setRecognizing(false);
    };

    recog.onend = () => {
      setRecognizing(false);
    };

    recognitionRef.current = recog;
    return recog;
  };

  const toggleListening = () => {
    const recog = initRecognition();
    if (!recog) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognizing) {
      recog.stop();
      setRecognizing(false);
      return;
    }

    try {
      recog.start();
    } catch (err) {
      console.warn("SpeechRecognition start error:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop?.();
        } catch (_) { }
        recognitionRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.5rem', backgroundColor: 'var(--surface, #0b1323)', borderRadius: '0.85rem', padding: '0.9rem', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.45rem', minHeight: 0 }}>
        {groupMessages.map((msg, i) => {
          const isMine = msg.sender === sender;
          const isCommander = (msg.sender || "").toLowerCase().includes("commander");

          return (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '0.25rem' }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.5rem 0.6rem',
                  borderRadius: '0.6rem',
                  wordBreak: 'break-word',
                  backgroundColor: isCommander ? 'rgba(0, 187, 255, 0.15)' : isMine ? 'rgba(0, 187, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  borderLeft: isCommander ? '2px solid #00bbff' : 'none',
                  color: '#e2e8f0',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isCommander ? '#00bbff' : '#94a3b8', marginBottom: '0.2rem', opacity: 0.95 }}>{msg.sender}</div>
                <div style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: '1.3' }}>{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-end', flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.6rem 0.8rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(11, 19, 35, 0.9)',
            color: '#e2e8f0',
            fontSize: '1rem',
          }}
          placeholder="Message..."
        />

        <button
          type="button"
          aria-pressed={recognizing}
          onClick={toggleListening}
          title={recognizing ? "Stop listening" : "Start speech input"}
          style={{
            padding: '0.45rem 0.6rem',
            borderRadius: '0.45rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: recognizing ? '#ff0000' : 'rgba(0, 187, 255, 0.2)',
            color: recognizing ? '#fff' : '#00bbff',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 120ms ease',
            fontSize: '0.85rem',
            flexShrink: 0,
          }}
        >
          {recognizing ? "🔴" : "🎤"}
        </button>

        <button
          onClick={handleSend}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '0.45rem',
            border: 'none',
            backgroundColor: '#00bbff',
            color: '#01060f',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 120ms ease',
            fontSize: '0.9rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 187, 255, 0.45)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
