import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as turnosApi from "@/api/turnos.api";
import type { Turno, ResumoSaldoTurno } from "@/api/turnos.api";
import { PainelSaldo } from "@/pages/Operacao/components/PainelSaldo";
import { formatarDataHora } from "@/utils/formatDate";

export function LeituraXPage() {
  const { turnoId } = useParams<{ turnoId: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [resumo, setResumo] = useState<ResumoSaldoTurno | null>(null);
  const [geradoEm, setGeradoEm] = useState<Date | null>(null);

  async function carregar() {
    if (!turnoId) return;
    try {
      const { turno: t, resumo: r } = await turnosApi.leituraX(turnoId);
      setTurno(t);
      setResumo(r);
      setGeradoEm(new Date());
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnoId]);

  return (
    <AppShell titulo="Leitura X — foto do caixa (não trava nada)">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", margin: 0, minWidth: 240 }}>
          {geradoEm ? `Gerada às ${formatarDataHora(geradoEm)}` : ""} — pode ser consultada quantas vezes quiser,
          a qualquer momento, sem nenhum efeito sobre o caixa.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" onClick={carregar}>
            Atualizar
          </Button>
          <Button size="sm" onClick={() => navigate(`/operacao/${turnoId}`)}>
            Voltar à operação
          </Button>
        </div>
      </div>

      {turno && resumo ? (
        <>
          <Card>
            <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)" }}>
              {turno.terminal.nome} · Turno #{turno.numeroSequencial} · {turno.operadorResponsavelAtual.nome} ·
              aberto em {formatarDataHora(turno.dataAbertura)}
            </div>
          </Card>
          <PainelSaldo resumo={resumo} />
        </>
      ) : (
        <p>Carregando…</p>
      )}
    </AppShell>
  );
}
