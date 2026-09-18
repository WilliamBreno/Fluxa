import type { ReactNode } from "react";

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

export function Modal({ aberto, titulo, onFechar, children }: ModalProps) {
  if (!aberto) return null;
  return (
    <div className="fx-modal-overlay" onClick={onFechar}>
      <div className="fx-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ font: "var(--fx-heading-3)", margin: 0 }}>{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--fx-text-tertiary)" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
