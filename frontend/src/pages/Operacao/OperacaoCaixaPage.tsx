import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, ShoppingCart, Undo2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as turnosApi from "@/api/turnos.api";
import * as movimentacoesApi from "@/api/movimentacoes.api";
import type { Turno, ResumoSaldoTurno } from "@/api/turnos.api";
import type { Movimentacao } from "@/api/movimentacoes.api";
import { PainelSaldo } from "./components/PainelSaldo";
import { AlertaTetoGaveta } from "./components/AlertaTetoGaveta";
import { FormVenda } from "./components/FormVenda";
import { FormSangria } from "./components/FormSangria";
import { FormSuprimento } from "./components/FormSuprimento";
import { FormCancelamento } from "./components/FormCancelamento";
import { ModalTrocaOperador } from "./components/ModalTrocaOperador";
import { ListaMovimentacoesTurno } from "./components/ListaMovimentacoesTurno";
import { usePermissao } from "@/hooks/usePermissao";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { formatarDataHora } from "@/utils/formatDate";

type ModalAberto = "venda" | "sangria" | "suprimento" | "cancelamento" | "troca-operador" | null;

export function OperacaoCaixaPage() {
  const { turnoId } = useParams<{ turnoId: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();
  const { atende } = usePermissao();

  const [turno, setTurno] = useState<Turno | null>(null);
  const [resumo, setResumo] = useState<ResumoSaldoTurno | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const [alertaTeto, setAlertaTeto] = useState<{ saldoDinheiroAtual: string; teto: string } | null>(null);

  const carregar = useCallback(async () => {
    if (!turnoId) return;
    try {
      const [turnoAtualizado, leitura, lista] = await Promise.all([
        turnosApi.buscarTurno(turnoId),
        turnosApi.leituraX(turnoId),
        movimentacoesApi.listarMovimentacoes(turnoId),
      ]);
      setTurno(turnoAtualizado);
      setResumo(leitura.resumo);
      setMovimentacoes(lista);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useSocketEvent<{ turnoId: string }>("movimentacao:criada", (payload) => {
    if (payload.turnoId === turnoId) carregar();
  });
  useSocketEvent<{ turnoId: string; saldoDinheiroAtual: string; teto: string }>("alerta:tetoGaveta", (payload) => {
    if (payload.turnoId === turnoId) setAlertaTeto(payload);
  });
  useSocketEvent<{ turnoId: string }>("turno:fechado", (payload) => {
    if (payload.turnoId === turnoId) {
      notificar("Este caixa foi fechado.", "info");
      navigate("/terminais");
    }
  });

  if (!turno || !resumo) {
    return (
      <AppShell titulo="Operação de caixa">
        <p>Carregando…</p>
      </AppShell>
    );
  }

  if (turno.status === "FECHADO") {
    return (
      <AppShell titulo="Operação de caixa">
        <Card>
          <p>Este caixa já foi fechado.</p>
          <Button onClick={() => navigate("/terminais")}>Voltar para seleção de caixa</Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell titulo={`${turno.terminal.nome} — Turno #${turno.numeroSequencial}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
          Responsável: {turno.operadorResponsavelAtual.nome} · Aberto em {formatarDataHora(turno.dataAbertura)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" onClick={() => setModalAberto("troca-operador")}>
            Trocar operador
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/operacao/${turnoId}/leitura-x`)}>
            Leitura X
          </Button>
          <Button size="sm" onClick={() => navigate(`/operacao/${turnoId}/fechamento`)}>
            Fechar caixa
          </Button>
        </div>
      </div>

      {alertaTeto && (
        <AlertaTetoGaveta
          saldoDinheiroAtual={alertaTeto.saldoDinheiroAtual}
          teto={alertaTeto.teto}
          onSolicitarSangria={() => {
            setAlertaTeto(null);
            setModalAberto("sangria");
          }}
          onFechar={() => setAlertaTeto(null)}
        />
      )}

      <PainelSaldo resumo={resumo} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Button onClick={() => setModalAberto("venda")}>
          <ShoppingCart size={15} strokeWidth={2} />
          Venda
        </Button>
        <Button variant="secondary" onClick={() => setModalAberto("suprimento")}>
          <ArrowDownToLine size={15} strokeWidth={2} />
          Suprimento
        </Button>
        {atende("SUPERVISOR") && (
          <Button variant="secondary" onClick={() => setModalAberto("sangria")}>
            <ArrowUpFromLine size={15} strokeWidth={2} />
            Sangria
          </Button>
        )}
        <InfoTooltip texto="Suprimento: entrada de dinheiro na gaveta que não é venda (ex.: reforço de troco). Sangria: retirada de dinheiro, só supervisor/gerente/admin, exige motivo permanente." />
        <Button variant="ghost" onClick={() => setModalAberto("cancelamento")}>
          <Undo2 size={15} strokeWidth={2} />
          Cancelamento / devolução
        </Button>
      </div>

      <ListaMovimentacoesTurno movimentacoes={movimentacoes} onAtualizar={carregar} />

      <FormVenda aberto={modalAberto === "venda"} turnoId={turno.id} onFechar={() => setModalAberto(null)} onSucesso={carregar} />
      <FormSangria aberto={modalAberto === "sangria"} turnoId={turno.id} onFechar={() => setModalAberto(null)} onSucesso={carregar} />
      <FormSuprimento aberto={modalAberto === "suprimento"} turnoId={turno.id} onFechar={() => setModalAberto(null)} onSucesso={carregar} />
      <FormCancelamento aberto={modalAberto === "cancelamento"} turnoId={turno.id} onFechar={() => setModalAberto(null)} onSucesso={carregar} />
      <ModalTrocaOperador aberto={modalAberto === "troca-operador"} turnoId={turno.id} onFechar={() => setModalAberto(null)} onSucesso={carregar} />
    </AppShell>
  );
}
