import { useEffect } from "react";
import { getSocket } from "@/sockets/socketClient";

export function useSocketEvent<T = unknown>(evento: string, handler: (payload: T) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(evento, handler);
    return () => {
      socket.off(evento, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);
}
