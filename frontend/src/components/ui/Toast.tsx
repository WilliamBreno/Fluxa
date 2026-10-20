import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  mensagem: string;
  tipo: "info" | "sucesso" | "erro";
}

interface ToastContextValue {
  notificar: (mensagem: string, tipo?: ToastItem["tipo"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);

  const notificar = useCallback((mensagem: string, tipo: ToastItem["tipo"] = "info") => {
    const id = proximoId++;
    setItens((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => {
      setItens((atual) => atual.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="fx-toast-container">
        {itens.map((t) => (
          <div key={t.id} className={`fx-toast ${t.tipo === "erro" ? "fx-toast--erro" : t.tipo === "sucesso" ? "fx-toast--sucesso" : ""}`}>
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

export function mensagemDeErro(err: unknown): string {
  const qualquer = err as { request?: unknown; response?: { status?: number; data?: { erro?: string } } };
  const erroDaApi = qualquer?.response?.data?.erro;
  if (erroDaApi) return erroDaApi;

  // Sem resposta nenhuma: rede caiu, servidor desligado ou bloqueio de CORS.
  if (qualquer?.request && !qualquer.response) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }
  // Resposta que não veio da nossa API (sem o campo "erro"): hospedagem fora do
  // ar, gateway, 404 da plataforma. Antes isso aparecia como "erro inesperado"
  // e parecia problema de senha.
  const status = qualquer?.response?.status;
  if (status && (status >= 500 || status === 404)) {
    return `O servidor está indisponível no momento (código ${status}). Tente novamente em alguns minutos.`;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
