import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function conectarSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io("/", { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
