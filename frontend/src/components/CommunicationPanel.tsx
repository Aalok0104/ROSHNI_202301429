// src/components/CommunicationPanel.tsx
import React, { useState } from 'react';
import * as responderApi from '../api/responder';
import '../styles.css';

type Channel = 'radio' | 'chat' | 'call';

interface Message {
  id: string;
  channel: Channel;
  text: string;
  time: string;
  sentBy: 'you' | 'system' | 'other';
}

const cannedMessages = [
  'Requesting backup at my location',
  'Situation under control, need medical assistance',
  'Evacuate civilians from the area',
  'Need immediate extraction',
];

export default function CommunicationPanel() {
  const [channel, setChannel] = useState<Channel>('radio');
  const [message, setMessage] = useState('');
  const [log, setLog] = useState<Message[]>([]);

  const addLog = (m: Message) => {
    setLog((s) => [m, ...s].slice(0, 50)); // keep last 50 messages
  };

  const sendMessage = async (text: string) => {
    const payload = { channel, text, timestamp: new Date().toISOString() };
    const ok = await responderApi.sendMessage(payload);
    const logItem: Message = {
      id: Math.random().toString(36).slice(2),
      channel,
      text,
      time: new Date().toLocaleTimeString(),
      sentBy: ok ? 'you' : 'system',
    };
    addLog(logItem);
    return ok;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    await sendMessage(message.trim());
    setMessage('');
  };

  const handleCanned = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Channel</label>
        <div className="flex gap-2">
          <label className={`p-2 border rounded cursor-pointer ${channel === 'radio' ? 'bg-blue-50' : ''}`}>
            <input type="radio" className="mr-1" checked={channel === 'radio'} onChange={() => setChannel('radio')} /> Radio
          </label>
          <label className={`p-2 border rounded cursor-pointer ${channel === 'chat' ? 'bg-blue-50' : ''}`}>
            <input type="radio" className="mr-1" checked={channel === 'chat'} onChange={() => setChannel('chat')} /> Chat
          </label>
          <label className={`p-2 border rounded cursor-pointer ${channel === 'call' ? 'bg-blue-50' : ''}`}>
            <input type="radio" className="mr-1" checked={channel === 'call'} onChange={() => setChannel('call')} /> Call
          </label>
        </div>
      </div>

      <form onSubmit={handleSend} className="mb-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded mb-2"
          rows={3}
          placeholder="Type a message..."
        />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded">Send</button>
          <button
            type="button"
            onClick={async () => {
              // quick location ping
              const ok = await responderApi.sendLocationPing();
              addLog({
                id: Math.random().toString(36).slice(2),
                channel: 'radio',
                text: ok ? 'Location ping sent' : 'Location ping failed',
                time: new Date().toLocaleTimeString(),
                sentBy: ok ? 'you' : 'system',
              });
            }}
            className="px-3 py-2 border rounded"
          >
            Send Location Ping
          </button>
        </div>
      </form>

      <div className="mb-3">
        <label className="block text-sm mb-1">Canned messages</label>
        <div className="flex flex-col gap-2">
          {cannedMessages.map((c) => (
            <button key={c} onClick={() => handleCanned(c)} className="text-left p-2 border rounded hover:bg-gray-50">
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Message log</h3>
        <div className="h-64 overflow-auto border rounded p-2 bg-white">
          {log.length === 0 && <div className="text-sm text-gray-500">No messages yet</div>}
          <ul className="space-y-2">
            {log.map((m) => (
              <li key={m.id} className="p-2 border rounded">
                <div className="text-xs text-gray-500">{m.channel.toUpperCase()} • {m.time}</div>
                <div className="mt-1">{m.text}</div>
                <div className="text-xs text-gray-400 mt-1">{m.sentBy === 'you' ? 'Sent' : 'System'}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
