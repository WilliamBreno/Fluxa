import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as fechamentoApi from "@/api/fechamento.api";
import type { FechamentoCaixa } from "@/api/fechamento.api";
import { formatarBRL } from "@/utils/formatMoney";

interface EtapaConfirmacaoProps {
  turnoId: string;
  fechamento: FechamentoCaixa;
  onConfirmado: () => void;
}

export function EtapaConfirmacao({ turnoId, fechamento, onConfirmado }: EtapaConfirmacaoProps) {
  const { notificar } = useToast();
  const [causaDivergencia, setCausaDivergencia] = useState("");
  const [gerarAjusteAutomatico, setGerarAjusteAutomatico] = useState(true);
  const [observacoesFechamento, setObservacoesFechamento] = useState("");
  const [enviando, setEnviando] = useState(false);

  const temDivergencia = fechamento.classificacaoGeral && fechamento.classificacaoGeral !== "EXATO";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await fechamentoApi.confirmarFechamento(turnoId, {
        causaDivergencia: causaDivergencia || undefined,
        gerarAjusteAutomatico,
        observacoesFechamento: observacoesFechamento || undefined,
      });
      notificar("Caixa fechado com sucesso (Redução Z gerada).", "sucesso");
      onConfirmado();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card style={{ maxWidth: 560 }}>
      <div style={{ font: "var(--fx-heading-3)", marginBottom: 4 }}>Confirmar fechamento (Redução Z)</div>
      <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", marginTop: 0 }}>
        Esta ação é definitiva: trava o turno e bloqueia novas movimentações neste caixa.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {temDivergencia && (
          <div className="fx-field">
            <label htmlFor="causa">
              Causa da divergência {Math.abs(Number(fechamento.divergenciaTotal)) > 0 ? "(obrigatório)" : ""}
            </label>
            <textarea
              id="causa"
              className="fx-input"
              style={{ height: 70, padding: 8, resize: "vertical" }}
              value={causaDivergencia}
              onChange={(e) => setCausaDivergencia(e.target.value)}
              placeholder={`Divergência de ${formatarBRL(fechamento.divergenciaTotal ?? "0")} — explique o motivo`}
            />
          </div>
        )}

        {temDivergencia && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--fx-body-sm)" }}>
            <input
              type="checkbox"
              checked={gerarAjusteAutomatico}
              onChange={(e) => setGerarAjusteAutomatico(e.target.checked)}
            />
            Gerar lançamento de ajuste automático para as formas com divergência
          </label>
        )}

        <div className="fx-field">
          <label htmlFor="obs">Observações do fechamento (opcional)</label>
          <textarea
            id="obs"
            className="fx-input"
            style={{ height: 70, padding: 8, resize: "vertical" }}
            value={observacoesFechamento}
            onChange={(e) => setObservacoesFechamento(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar e fechar caixa"}
        </Button>
      </form>
    </Card>
  );
}
