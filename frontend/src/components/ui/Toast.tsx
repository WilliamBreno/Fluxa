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
  const qualquer = err as { response?: { data?: { erro?: string } } };
  return qualquer?.response?.data?.erro ?? "Ocorreu um erro inesperado. Tente novamente.";
}
