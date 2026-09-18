import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as dashboardApi from "@/api/dashboard.api";
import type { KpisDashboard, FluxoCaixa, UltimoLancamento } from "@/api/dashboard.api";
import { KpiCard } from "./components/KpiCard";
import { GraficoFluxoCaixa } from "./components/GraficoFluxoCaixa";
import { ListaUltimosLancamentos } from "./components/ListaUltimosLancamentos";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";

export function DashboardPage() {
  const { usuario, lojaId } = useAuth();
  const { notificar } = useToast();
  const [kpis, setKpis] = useState<KpisDashboard | null>(null);
  const [fluxo, setFluxo] = useState<FluxoCaixa | null>(null);
  const [lancamentos, setLancamentos] = useState<UltimoLancamento[]>([]);

  async function carregar() {
    try {
      const [k, f, l] = await Promise.all([
        dashboardApi.obterKpis(),
        dashboardApi.obterFluxoCaixa(),
        dashboardApi.obterUltimosLancamentos(),
      ]);
      setKpis(k);
      setFluxo(f);
      setLancamentos(l);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  useSocketEvent("movimentacao:criada", carregar);
  useSocketEvent("turno:fechado", carregar);

  const nomeLoja = usuario?.lojas.find((l) => l.lojaId === lojaId)?.nome ?? "sua loja";

  return (
    <AppShell titulo="Visão geral">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="fx-overline">Hoje</span>
          <h1 style={{ font: "var(--fx-heading-1)", margin: "4px 0 0", letterSpacing: "var(--fx-tracking-tight)" }}>
            Resumo do caixa
          </h1>
          <p style={{ font: "var(--fx-body)", color: "var(--fx-text-tertiary)", margin: "4px 0 0" }}>
            Panorama consolidado de {nomeLoja} em tempo real.
          </p>
        </div>
      </div>

      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <KpiCard label="Entradas hoje" valor={kpis.entradas.valor} delta={kpis.entradas.delta} legenda="vs. 7 dias anteriores" />
          <KpiCard
            label="Saídas hoje"
            valor={kpis.saidas.valor}
            delta={kpis.saidas.delta}
            invertDelta
            legenda="vs. 7 dias anteriores"
          />
          <KpiCard label="Fiado em aberto" valor={kpis.fiadoEmAberto.valor} legenda="últimos 7 dias" />
          <KpiCard
            tone="inverse"
            label="Saldo em caixa agora"
            valor={kpis.saldoProjetado.valor}
            legenda={`${kpis.saldoProjetado.turnosAbertos} caixa(s) aberto(s)`}
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>
        {fluxo && <GraficoFluxoCaixa fluxo={fluxo} />}
        <ListaUltimosLancamentos itens={lancamentos} />
      </div>
    </AppShell>
  );
}
