import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as fechamentoApi from "@/api/fechamento.api";
import type { FechamentoCaixa } from "@/api/fechamento.api";
import { EtapaContagemCega } from "./components/EtapaContagemCega";
import { EtapaDivergencia } from "./components/EtapaDivergencia";
import { EtapaConfirmacao } from "./components/EtapaConfirmacao";

type Fase = "carregando" | "contagem" | "divergencia" | "confirmacao" | "confirmado" | "erro";

export function FechamentoCaixaPage() {
  const { turnoId } = useParams<{ turnoId: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();

  const [fase, setFase] = useState<Fase>("carregando");
  const [fechamento, setFechamento] = useState<FechamentoCaixa | null>(null);

  useEffect(() => {
    if (!turnoId) return;
    (async () => {
      try {
        const inicial = await fechamentoApi.iniciarFechamento(turnoId);
        if (inicial.status === "CONTAGEM_PENDENTE") {
          setFase("contagem");
        } else if (inicial.status === "CONFIRMADO") {
          setFechamento(inicial);
          setFase("confirmado");
        } else {
          // CONTAGEM_REALIZADA ou CALCULADO: a contagem já foi feita antes
          // (ex.: o operador recarregou a página) — é seguro buscar a
          // divergência aqui, pois ela já estava persistida de forma imutável.
          const divergencia = await fechamentoApi.obterDivergencia(turnoId);
          setFechamento(divergencia);
          setFase("divergencia");
        }
      } catch (err) {
        notificar(mensagemDeErro(err), "erro");
        setFase("erro");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnoId]);

  if (!turnoId) return null;

  return (
    <AppShell titulo="Fechamento de caixa (Redução Z)">
      {fase === "carregando" && <p>Carregando…</p>}

      {fase === "erro" && (
        <Card>
          <p>Não foi possível iniciar o fechamento deste turno.</p>
          <Button onClick={() => navigate(`/operacao/${turnoId}`)}>Voltar</Button>
        </Card>
      )}

      {fase === "contagem" && (
        <EtapaContagemCega
          turnoId={turnoId}
          onContagemRegistrada={(resultado) => {
            setFechamento(resultado);
            setFase("divergencia");
          }}
        />
      )}

      {fase === "divergencia" && fechamento && (
        <EtapaDivergencia fechamento={fechamento} onContinuar={() => setFase("confirmacao")} />
      )}

      {fase === "confirmacao" && fechamento && (
        <EtapaConfirmacao
          turnoId={turnoId}
          fechamento={fechamento}
          onConfirmado={() => setFase("confirmado")}
        />
      )}

      {fase === "confirmado" && (
        <Card style={{ maxWidth: 480 }}>
          <div style={{ font: "var(--fx-heading-3)", marginBottom: 8 }}>Caixa fechado ✓</div>
          <p style={{ color: "var(--fx-text-secondary)" }}>
            O relatório de fechamento (Redução Z) foi gerado e o turno está travado.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => navigate(`/relatorios?turnoId=${turnoId}`)}>
              Ver relatório
            </Button>
            <Button onClick={() => navigate("/terminais")}>Voltar para os caixas</Button>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
