import { api } from "./client";

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

export function baixarRelatorioFechamento(turnoId: string, formato: "pdf" | "xlsx") {
  return baixarArquivo(
    `/relatorios/fechamento/${turnoId}`,
    { formato },
    `fechamento-${turnoId}.${formato}`
  );
}

export function baixarExportacaoContabil(dataInicio: string, dataFim: string) {
  return baixarArquivo(
    "/relatorios/exportacao-contabil",
    { dataInicio, dataFim, formato: "xlsx" },
    `exportacao-contabil-${dataInicio}-a-${dataFim}.xlsx`
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
