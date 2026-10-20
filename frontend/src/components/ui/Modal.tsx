import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  /** Largura máxima em px (padrão 480). */
  largura?: number;
}

export function Modal({ aberto, titulo, onFechar, children, largura }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  // Esc fecha só o modal do topo (o último overlay no body), não a pilha inteira.
  useEffect(() => {
    if (!aberto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const overlays = document.querySelectorAll(".fx-modal-overlay");
      if (overlays[overlays.length - 1] === overlayRef.current) onFecharRef.current();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [aberto]);

  if (!aberto) return null;
  // Portal no body: um modal aberto de dentro de outro (ex.: cadastrar cliente
  // no meio de um agendamento) não fica com <form> aninhado no DOM.
  return createPortal(
    <div className="fx-modal-overlay" ref={overlayRef} onClick={onFechar}>
      <div
        className="fx-modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={largura ? { maxWidth: largura } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
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
    </div>,
    document.body
  );
}
