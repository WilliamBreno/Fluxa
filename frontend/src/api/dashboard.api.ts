import { api } from "./client";

export interface KpisDashboard {
  entradas: { valor: string; delta: number };
  saidas: { valor: string; delta: number };
  fiadoEmAberto: { valor: string };
  saldoProjetado: { valor: string; turnosAbertos: number };
}

export interface FluxoCaixa {
  labels: string[];
  series: { label: string; cor: string; dados: number[] }[];
}

export interface UltimoLancamento {
  id: string;
  titulo: string;
  meta: string;
  valor: string;
  direcao: "in" | "out";
}

export async function obterKpis() {
  const { data } = await api.get<KpisDashboard>("/dashboard/kpis");
  return data;
}

export async function obterFluxoCaixa() {
  const { data } = await api.get<FluxoCaixa>("/dashboard/fluxo-caixa");
  return data;
}

export async function obterUltimosLancamentos() {
  const { data } = await api.get<UltimoLancamento[]>("/dashboard/ultimos-lancamentos");
  return data;
}
