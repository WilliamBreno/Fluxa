import { formatarBRL } from "@/utils/formatMoney";
import { Button } from "@/components/ui/Button";

interface AlertaTetoGavetaProps {
  saldoDinheiroAtual: string;
  teto: string;
  onSolicitarSangria: () => void;
  onFechar: () => void;
}

export function AlertaTetoGaveta({ saldoDinheiroAtual, teto, onSolicitarSangria, onFechar }: AlertaTetoGavetaProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: "var(--fx-color-warning-bg)",
        border: "1px solid var(--fx-color-warning)",
        borderRadius: "var(--fx-radius-card)",
        padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden style={{ fontSize: 20 }}>⚠️</span>
        <span style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-primary)" }}>
          Dinheiro em caixa ({formatarBRL(saldoDinheiroAtual)}) ultrapassou o teto configurado ({formatarBRL(teto)}).
          Considere fazer uma sangria para reduzir o risco.
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Button size="sm" onClick={onSolicitarSangria}>
          Fazer sangria
        </Button>
        <Button size="sm" variant="ghost" onClick={onFechar}>
          Dispensar
        </Button>
      </div>
    </div>
  );
}
