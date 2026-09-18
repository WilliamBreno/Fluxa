import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatarBRL } from "@/utils/formatMoney";
import type { FluxoCaixa } from "@/api/dashboard.api";

interface GraficoFluxoCaixaProps {
  fluxo: FluxoCaixa;
}

export function GraficoFluxoCaixa({ fluxo }: GraficoFluxoCaixaProps) {
  const dados = fluxo.labels.map((label, i) => {
    const linha: Record<string, string | number> = { mes: label };
    fluxo.series.forEach((serie) => {
      linha[serie.label] = serie.dados[i] ?? 0;
    });
    return linha;
  });

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ font: "var(--fx-heading-4)" }}>Fluxo de caixa</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} barGap={4} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--fx-border-subtle)" />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--fx-text-tertiary)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--fx-text-tertiary)", fontSize: 12 }}
            tickFormatter={(v) => `R$ ${v}`}
            width={64}
          />
          <Tooltip
            formatter={(valor: number) => formatarBRL(valor)}
            contentStyle={{
              background: "var(--fx-surface-card)",
              border: "1px solid var(--fx-border-subtle)",
              borderRadius: "var(--fx-radius-control)",
              font: "var(--fx-body-sm)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {fluxo.series.map((serie) => (
            <Bar key={serie.label} dataKey={serie.label} fill={serie.cor} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
