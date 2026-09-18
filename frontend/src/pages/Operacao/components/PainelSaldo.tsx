import { Card } from "@/components/ui/Card";
import { formatarBRL } from "@/utils/formatMoney";
import type { ResumoSaldoTurno } from "@/api/turnos.api";

const ROTULO_FORMA: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  PIX: "Pix",
  VALE: "Vale",
  FIADO: "Fiado",
  OUTRO: "Outro",
};

interface PainelSaldoProps {
  resumo: ResumoSaldoTurno;
}

export function PainelSaldo({ resumo }: PainelSaldoProps) {
  const formas = Object.entries(resumo.saldoPorForma).filter(([, valor]) => Number(valor) !== 0);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ font: "var(--fx-heading-4)" }}>Saldo do turno</span>
        <span className="fx-overline">Leitura em tempo real</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {formas.length === 0 && (
          <span style={{ color: "var(--fx-text-tertiary)" }}>Nenhuma movimentação ainda.</span>
        )}
        {formas.map(([forma, valor]) => (
          <div key={forma}>
            <div className="fx-overline">{ROTULO_FORMA[forma] ?? forma}</div>
            <div style={{ font: "var(--fx-heading-3)" }}>{formatarBRL(valor)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: "1px solid var(--fx-border-subtle)" }}>
        <div>
          <div className="fx-overline">Cupons emitidos</div>
          <div style={{ font: "var(--fx-heading-4)" }}>{resumo.quantidadeCupons}</div>
        </div>
        <div>
          <div className="fx-overline">Ticket médio</div>
          <div style={{ font: "var(--fx-heading-4)" }}>{formatarBRL(resumo.ticketMedio)}</div>
        </div>
        <div>
          <div className="fx-overline">Sangrias</div>
          <div style={{ font: "var(--fx-heading-4)" }}>{formatarBRL(resumo.totalSangrias)}</div>
        </div>
        <div>
          <div className="fx-overline">Suprimentos</div>
          <div style={{ font: "var(--fx-heading-4)" }}>{formatarBRL(resumo.totalSuprimentos)}</div>
        </div>
      </div>
    </Card>
  );
}
