import { api } from "./client";
import type { FormaPagamento } from "./turnos.api";
import type { TipoMovimentacao } from "./movimentacoes.api";

export async function buscarRelatorioFechamento(turnoId: string) {
  const { data } = await api.get(`/relatorios/fechamento/${turnoId}`);
  return data;
}

/**
 * As rotas de exportação exigem o Bearer token e o header x-loja-id, que só o
 * cliente axios (`api`) anexa — um `window.open`/link direto para a URL não
 * envia esses headers e voltaria 401. Por isso o download é sempre feito via
 * blob e um link temporário, nunca navegação direta para a URL da API.
 */
async function baixarArquivo(caminho: string, params: Record<string, string>, nomeArquivo: string) {
  const resposta = await api.get(caminho, { params, responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function baixarRelatorioFechamento(turnoId: string, formato: "pdf" | "xlsx" | "csv") {
  return baixarArquivo(`/relatorios/fechamento/${turnoId}`, { formato }, `fechamento-${turnoId}.${formato}`);
}

export function baixarExportacaoContabil(dataInicio: string, dataFim: string, formato: "xlsx" | "csv" = "xlsx") {
  return baixarArquivo(
    "/relatorios/exportacao-contabil",
    { dataInicio, dataFim, formato },
    `exportacao-contabil-${dataInicio}-a-${dataFim}.${formato}`
  );
}

export async function comparativo(params: {
  dataInicio?: string;
  dataFim?: string;
  agruparPor: "operador" | "terminal" | "dia";
}) {
  const { data } = await api.get("/relatorios/comparativo", { params });
  return data as { chave: string; quantidadeTurnos: number; divergenciaTotal: string; comDivergencia: number }[];
}

export async function alertasDivergencia() {
  const { data } = await api.get("/relatorios/alertas-divergencia");
  return data as { operadorId: string; operadorNome: string; ocorrencias: number; divergenciaAcumulada: string }[];
}

export async function previsaoCaixa() {
  const { data } = await api.get("/relatorios/previsao");
  return data as { mediaDiariaHistorica: string; baseDias: number; projecao: { data: string; saldoProjetado: string }[] };
}

export interface DivergenciaPorOperador {
  operadorId: string;
  operadorNome: string;
  quantidadeTurnos: number;
  divergenciaMedia: string;
  divergenciaMaxima: string;
  turnosComFalta: number;
  turnosComSobra: number;
  tendencia: "MELHORANDO" | "PIORANDO" | "ESTAVEL";
}

export async function divergenciaPorOperador(params: { dataInicio?: string; dataFim?: string }) {
  const { data } = await api.get("/relatorios/divergencia-por-operador", { params });
  return data as DivergenciaPorOperador[];
}

export function baixarDivergenciaPorOperador(dataInicio?: string, dataFim?: string) {
  return baixarArquivo(
    "/relatorios/divergencia-por-operador",
    { ...(dataInicio && { dataInicio }), ...(dataFim && { dataFim }), formato: "csv" },
    "divergencia-por-operador.csv"
  );
}

export interface VendaPorFormaPeriodo {
  periodo: string;
  total: string;
  quantidade: number;
  porForma: Record<FormaPagamento, string>;
}

export async function vendasPorForma(params: {
  dataInicio: string;
  dataFim: string;
  agrupamento: "hora" | "dia";
  terminalId?: string;
}) {
  const { data } = await api.get("/relatorios/vendas-por-forma", { params });
  return data as VendaPorFormaPeriodo[];
}

export function baixarVendasPorForma(params: {
  dataInicio: string;
  dataFim: string;
  agrupamento: "hora" | "dia";
  terminalId?: string;
}) {
  return baixarArquivo("/relatorios/vendas-por-forma", { ...params, formato: "csv" }, "vendas-por-forma.csv");
}

export interface MovimentacaoRelatorio {
  id: string;
  tipo: TipoMovimentacao;
  formaPagamento: FormaPagamento | null;
  valor: string;
  motivo: string | null;
  createdAt: string;
  operador: { id: string; nome: string };
  autorizadoPor: { id: string; nome: string } | null;
  turno: { numeroSequencial: number; terminal: { nome: string } };
}

interface FiltrosMovimentacoes {
  dataInicio?: string;
  dataFim?: string;
  terminalId?: string;
  operadorId?: string;
  formaPagamento?: FormaPagamento;
  tipo?: TipoMovimentacao;
}

export async function movimentacoesRelatorio(params: FiltrosMovimentacoes) {
  const { data } = await api.get("/relatorios/movimentacoes", { params });
  return data as MovimentacaoRelatorio[];
}

export function baixarMovimentacoesRelatorio(params: FiltrosMovimentacoes) {
  return baixarArquivo("/relatorios/movimentacoes", { ...params, formato: "csv" } as Record<string, string>, "movimentacoes.csv");
}

export interface EstornoRelatorio {
  id: string;
  tipo: "CANCELAMENTO" | "DEVOLUCAO";
  valor: string;
  motivo: string | null;
  createdAt: string;
  operador: { id: string; nome: string };
  vendaReferencia: { id: string; valor: string; formaPagamento: FormaPagamento | null; createdAt: string } | null;
}

interface FiltrosEstornos {
  dataInicio?: string;
  dataFim?: string;
  terminalId?: string;
}

export async function estornosRelatorio(params: FiltrosEstornos) {
  const { data } = await api.get("/relatorios/estornos", { params });
  return data as EstornoRelatorio[];
}

export function baixarEstornosRelatorio(params: FiltrosEstornos) {
  return baixarArquivo("/relatorios/estornos", { ...params, formato: "csv" } as Record<string, string>, "estornos.csv");
}

export function baixarAuditoriaCsv() {
  return baixarArquivo("/auditoria/exportar", {}, "auditoria.csv");
}
