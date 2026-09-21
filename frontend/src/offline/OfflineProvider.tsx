import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import * as queue from "./queue";
import * as sync from "./sync";
import type { OperacaoRejeitada } from "./types";

interface OfflineContextValue {
  online: boolean;
  sincronizando: boolean;
  pendentes: number;
  rejeitadas: OperacaoRejeitada[];
  atualizar: () => void;
  removerRejeitada: (id: string) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [rejeitadas, setRejeitadas] = useState<OperacaoRejeitada[]>([]);

  const atualizar = useCallback(() => {
    setOnline(navigator.onLine);
    setSincronizando(sync.estaSincronizando());
    queue.listarPendentes().then((lista) => setPendentes(lista.length));
    queue.listarRejeitadas().then(setRejeitadas);
  }, []);

  useEffect(() => {
    sync.iniciarSync();
    atualizar();
    const cancelar = sync.aoMudar(atualizar);
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    const intervalo = setInterval(atualizar, 5000);
    return () => {
      cancelar();
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
      clearInterval(intervalo);
    };
  }, [atualizar]);

  async function removerRejeitada(id: string) {
    await queue.removerRejeitada(id);
    atualizar();
  }

  return (
    <OfflineContext.Provider value={{ online, sincronizando, pendentes, rejeitadas, atualizar, removerRejeitada }}>
      {children}
    </OfflineContext.Provider>
  );
}
