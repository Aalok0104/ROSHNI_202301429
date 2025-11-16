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
    <div className="border rounded p-3 w-full">
      <div className="h-64 overflow-y-auto bg-gray-50 mb-2 p-2">
        {groupMessages.map((msg, i) => {
          const isMine = msg.sender === sender;
          const isCommander = (msg.sender || "").toLowerCase().includes("commander");

          return (
            <div
              key={i}
              className={`my-2 flex ${isMine ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[75%] p-2 rounded-lg shadow-sm ${isCommander
                    ? "bg-yellow-100 border-l-4 border-yellow-400"
                    : isMine
                      ? "bg-blue-200 text-gray-900"
                      : "bg-gray-200 text-gray-900"
                  }`}
              >
                <div className="text-sm font-semibold">{msg.sender}</div>
                <div className="text-sm break-words">{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>


      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-1 rounded p-2"
          placeholder="Type a message..."
        />

        <button
          type="button"
          aria-pressed={recognizing}
          onClick={toggleListening}
          title={recognizing ? "Stop listening" : "Start speech input"}
          className={`px-3 py-2 rounded ${recognizing ? "bg-red-500 text-white" : "bg-gray-200"
            }`}
        >
          {recognizing ? "🔴" : "🎤"}
        </button>

        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
