import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { nomeSalaLoja } from "../sockets/events";
import { logger } from "./logger";

let io: SocketIOServer | undefined;

interface AccessTokenPayload {
  sub: string;
  lojaId?: string;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Token ausente"));
    }
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
      socket.data.usuarioId = payload.sub;
      socket.data.lojaId = payload.lojaId;
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    const lojaId = socket.data.lojaId as string | undefined;
    if (lojaId) {
      socket.join(nomeSalaLoja(lojaId));
    }
    socket.on("loja:entrar", (novaLojaId: string) => {
      socket.join(nomeSalaLoja(novaLojaId));
    });
    logger.info("Cliente socket conectado", { usuarioId: socket.data.usuarioId });
  });

  return io;
}

export function emitirParaLoja(lojaId: string, evento: string, payload: unknown) {
  if (!io) return;
  io.to(nomeSalaLoja(lojaId)).emit(evento, payload);
}
