import { Info } from "lucide-react";

interface InfoTooltipProps {
  texto: string;
}

/** Ícone "i" para explicar rapidamente uma função não óbvia, sem poluir a tela com texto fixo. */
export function InfoTooltip({ texto }: InfoTooltipProps) {
  return (
    <span className="fx-info">
      <button type="button" className="fx-info-trigger" aria-label={texto}>
        <Info size={11} strokeWidth={2.5} />
      </button>
      <span className="fx-info-bubble" role="tooltip">
        {texto}
      </span>
    </span>
  );
}
