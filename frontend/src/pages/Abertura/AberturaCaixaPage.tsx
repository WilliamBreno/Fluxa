import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as turnosApi from "@/api/turnos.api";
import type { PeriodoTurno } from "@/api/turnos.api";

const OPCOES_PERIODO: { value: PeriodoTurno; label: string }[] = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
  { value: "INTEGRAL", label: "Integral (dia todo)" },
];

export function AberturaCaixaPage() {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();

  const [periodo, setPeriodo] = useState<PeriodoTurno>("INTEGRAL");
  const [fundoTroco, setFundoTroco] = useState("");
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!terminalId) return;
    turnosApi.sugestaoFundoTroco(terminalId).then((valor) => {
      setSugestao(valor);
      if (valor && !fundoTroco) setFundoTroco(valor);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!terminalId) return;
    setEnviando(true);
    try {
      const turno = await turnosApi.abrirTurno({
        terminalId,
        periodo,
        fundoTrocoInformado: Number(fundoTroco.replace(",", ".")),
        observacoesAbertura: observacoes || undefined,
      });
      notificar("Caixa aberto com sucesso.", "sucesso");
      navigate(`/operacao/${turno.id}`);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell titulo="Abertura de caixa">
      <Card style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label="Turno"
            opcoes={OPCOES_PERIODO}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoTurno)}
          />

          <Input
            label={`Fundo de troco inicial (R$)${sugestao ? ` — sugestão: R$ ${sugestao}` : ""}`}
            type="number"
            step="0.01"
            min={0}
            required
            value={fundoTroco}
            onChange={(e) => setFundoTroco(e.target.value)}
            placeholder="Contagem física do dinheiro na gaveta"
          />

          <div className="fx-field">
            <label htmlFor="observacoes">Observações (opcional)</label>
            <textarea
              id="observacoes"
              className="fx-input"
              style={{ height: 80, padding: 8, resize: "vertical" }}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={enviando}>
            {enviando ? "Abrindo…" : "Abrir caixa"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
