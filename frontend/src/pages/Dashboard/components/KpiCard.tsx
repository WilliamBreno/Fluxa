import { Card } from "@/components/ui/Card";
import { formatarBRL, formatarPercentual } from "@/utils/formatMoney";

interface KpiCardProps {
  label: string;
  valor: string;
  delta?: number;
  invertDelta?: boolean;
  legenda?: string;
  tone?: "default" | "inverse";
}

export function KpiCard({ label, valor, delta, invertDelta, legenda, tone = "default" }: KpiCardProps) {
  const positivo = delta !== undefined && (invertDelta ? delta < 0 : delta > 0);
  const corDelta = delta === undefined ? undefined : positivo ? "var(--fx-color-success)" : "var(--fx-color-danger)";

  return (
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: tone === "inverse" ? "var(--fx-surface-sidebar)" : undefined,
        color: tone === "inverse" ? "var(--fx-text-on-sidebar)" : undefined,
        borderColor: tone === "inverse" ? "transparent" : undefined,
      }}
    >
      <span
        className="fx-overline"
        style={{ color: tone === "inverse" ? "var(--fx-text-on-sidebar-muted)" : undefined }}
      >
        {label}
      </span>
      <span style={{ font: "var(--fx-heading-1)" }}>{formatarBRL(valor)}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--fx-caption)" }}>
        {delta !== undefined && <span style={{ color: corDelta, fontWeight: 700 }}>{formatarPercentual(delta)}</span>}
        {legenda && (
          <span style={{ color: tone === "inverse" ? "var(--fx-text-on-sidebar-muted)" : "var(--fx-text-tertiary)" }}>
            {legenda}
          </span>
        )}
      </div>
    </Card>
  );
}
