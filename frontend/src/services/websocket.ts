let socket: WebSocket | null = null;

export const connectWebSocket = (userId: string) => {
  socket = new WebSocket(`ws://localhost:8080?userId=${userId}`); // backend WebSocket server URL

  socket.onopen = () => console.log("✅ Connected to WebSocket");
  socket.onclose = () => console.log("❌ Disconnected from WebSocket");
  socket.onerror = (e) => console.error("WebSocket error:", e);
};

export const sendMessage = (message: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const subscribeToMessages = (callback: (msg: any) => void) => {
  if (!socket) return;
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
};
