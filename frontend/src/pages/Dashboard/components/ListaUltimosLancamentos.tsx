import { Card } from "@/components/ui/Card";
import { formatarBRL } from "@/utils/formatMoney";
import type { UltimoLancamento } from "@/api/dashboard.api";

interface ListaUltimosLancamentosProps {
  itens: UltimoLancamento[];
}

export function ListaUltimosLancamentos({ itens }: ListaUltimosLancamentosProps) {
  return (
    <Card>
      <div style={{ font: "var(--fx-heading-4)", marginBottom: 10 }}>Últimos lançamentos</div>
      {itens.length === 0 ? (
        <p style={{ color: "var(--fx-text-tertiary)" }}>Nenhum lançamento ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {itens.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid var(--fx-border-subtle)",
              }}
            >
              <div>
                <div style={{ font: "var(--fx-body-sm)", fontWeight: 600 }}>{item.titulo}</div>
                <div className="fx-overline">{item.meta}</div>
              </div>
              <span
                style={{
                  font: "var(--fx-body-sm)",
                  fontWeight: 700,
                  color: item.direcao === "in" ? "var(--fx-color-success)" : "var(--fx-color-danger)",
                }}
              >
                {item.direcao === "in" ? "+" : "−"} {formatarBRL(item.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
