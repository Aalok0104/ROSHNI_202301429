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
    <div className="border rounded p-3 w-full flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-2 bg-gray-50 p-2 rounded" style={{ minHeight: 0 }}>
        {groupMessages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          groupMessages.map((msg, i) => {
            const isMine = msg.sender_user_id === currentUserId;
            return (
              <div key={msg.id ?? i} className={`my-2 flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-2 rounded-lg shadow-sm ${isMine ? "bg-blue-200" : "bg-gray-200"}`}>
                  <div className="text-sm font-semibold">{msg.sender}</div>
                  <div className="text-sm">{msg.text}</div>
                  <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={voiceEnabled} onChange={() => setVoiceEnabled(!voiceEnabled)} />
          <span className="text-sm">🔊 Read Messages</span>
        </label>
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-1 rounded p-2"
          placeholder={type === "global" ? "Type a global message..." : "Type a team message..."}
        />

        <button
          onClick={toggleListening}
          className={`px-3 py-2 rounded ${recognizing ? "bg-red-500 text-white" : "bg-gray-200"}`}
          type="button"
        >
          {recognizing ? "🔴" : "🎤"}
        </button>

        <button onClick={handleSend} className="bg-blue-500 text-white px-4 py-2 rounded" type="button">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
