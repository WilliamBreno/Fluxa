import { Card } from "@/components/ui/Card";
import { formatarBRL } from "@/utils/formatMoney";
import type { ResumoConciliacao as ResumoConciliacaoType } from "@/api/conciliacao.api";

interface ResumoConciliacaoProps {
  resumo: ResumoConciliacaoType;
}

export function ResumoConciliacao({ resumo }: ResumoConciliacaoProps) {
  const itens = [
    { label: "Conciliado", valor: resumo.conciliado, cor: "var(--fx-color-success)" },
    { label: "Divergente", valor: resumo.divergente, cor: "var(--fx-color-danger)" },
    { label: "Pendente de revisão", valor: resumo.pendenteRevisao, cor: "var(--fx-color-warning)" },
    { label: "Sem extrato", valor: resumo.semExtrato, cor: "var(--fx-text-secondary)" },
    { label: "Sem venda no caixa", valor: resumo.semVenda, cor: "var(--fx-text-secondary)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
      {itens.map((item) => (
        <Card key={item.label}>
          <div className="fx-overline">{item.label}</div>
          <div style={{ font: "var(--fx-heading-1)", color: item.cor }}>{item.valor}</div>
        </Card>
      ))}
      <Card style={{ background: "var(--fx-surface-sidebar)", color: "var(--fx-text-on-sidebar)" }}>
        <div className="fx-overline" style={{ color: "var(--fx-text-on-sidebar-muted)" }}>
          Valor em risco
        </div>
        <div style={{ font: "var(--fx-heading-1)" }}>{formatarBRL(resumo.valorEmRisco)}</div>
      </Card>
    </div>
  );
}
