import { io, type Socket } from "socket.io-client";

// Mesma lógica do api/client.ts: em dev "/" basta (Vite faz proxy do
// /socket.io para o backend); em produção precisa da URL pública do backend.
const SOCKET_URL = import.meta.env.VITE_API_URL || "/";

let socket: Socket | null = null;

export function conectarSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
