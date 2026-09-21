import { api } from "./client";

export type Bandeira = "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "HIPERCARD" | "OUTRA";
export type ModalidadeCartao = "DEBITO" | "CREDITO_A_VISTA" | "CREDITO_PARCELADO";
export type StatusExtrato = "PROCESSANDO" | "CONCLUIDO" | "ERRO";
export type StatusConciliacaoMovimentacao = "SEM_EXTRATO" | "CONCILIADO" | "DIVERGENTE" | "PENDENTE_REVISAO" | "MANUAL";
export type StatusConciliacaoTransacao = "CONCILIADO" | "DIVERGENTE" | "SEM_VENDA" | "MANUAL" | "IGNORADO";

export interface ResultadoImportacao {
  extratoId: string;
  status: StatusExtrato;
  totalLinhas: number;
  totalImportadas: number;
  erro?: string;
  cabecalhosDisponiveis?: string[];
  mapeamentoSugerido?: Record<string, string>;
}

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result as string;
      // resultado vem como "data:text/csv;base64,AAAA..." — pega só a parte depois da vírgula
      resolve(resultado.split(",")[1] ?? "");
    };
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

export async function importarExtrato(arquivo: File, adquirente: string) {
  const conteudoBase64 = await arquivoParaBase64(arquivo);
  const { data } = await api.post<ResultadoImportacao>("/conciliacao/extratos", {
    adquirente,
    nomeArquivo: arquivo.name,
    conteudoBase64,
  });
  return data;
}

export async function confirmarMapeamento(extratoId: string, arquivo: File, mapeamento: Record<string, string>) {
  const conteudoBase64 = await arquivoParaBase64(arquivo);
  const { data } = await api.post<ResultadoImportacao>(`/conciliacao/extratos/${extratoId}/mapeamento`, {
    conteudoBase64,
    mapeamento,
  });
  return data;
}

export interface ExtratoCartao {
  id: string;
  adquirente: string;
  nomeArquivo: string;
  status: StatusExtrato;
  totalLinhas: number;
  totalImportadas: number;
  erro: string | null;
  createdAt: string;
  importadoPor: { id: string; nome: string };
}

export async function listarExtratos() {
  const { data } = await api.get<ExtratoCartao[]>("/conciliacao/extratos");
  return data;
}

export async function executarConciliacao(dataInicio: string, dataFim: string) {
  const { data } = await api.post("/conciliacao/executar", { dataInicio, dataFim });
  return data as {
    conciliadasNivel1: number;
    conciliadasNivel2: number;
    divergentes: number;
    pendentesRevisao: number;
    semExtrato: number;
    semVenda: number;
  };
}

export interface ConciliacaoCartao {
  id: string;
  movimentacaoId: string | null;
  transacaoExtratoId: string | null;
  statusMovimentacao: StatusConciliacaoMovimentacao;
  statusTransacao: StatusConciliacaoTransacao | null;
  nivelConfianca: number | null;
  diferencaValor: string | null;
  observacao: string | null;
  resolvidoPor: { id: string; nome: string } | null;
  resolvidoEm: string | null;
  createdAt: string;
  movimentacao: {
    id: string;
    valor: string;
    formaPagamento: string | null;
    createdAt: string;
    nsuMaquininha: string | null;
    turno: { terminal: { nome: string } };
  } | null;
  transacaoExtrato: {
    id: string;
    nsu: string | null;
    bandeira: Bandeira | null;
    valorBruto: string;
    valorLiquido: string;
    dataVenda: string;
    dataPagamentoPrevista: string;
  } | null;
}

export async function listarConciliacoes(params?: { status?: StatusConciliacaoMovimentacao; dataInicio?: string; dataFim?: string }) {
  const { data } = await api.get<ConciliacaoCartao[]>("/conciliacao", { params });
  return data;
}

export interface ResumoConciliacao {
  conciliado: number;
  divergente: number;
  pendenteRevisao: number;
  semExtrato: number;
  semVenda: number;
  valorEmRisco: string;
}

export async function resumoConciliacao() {
  const { data } = await api.get<ResumoConciliacao>("/conciliacao/resumo");
  return data;
}

export async function resolverManual(
  conciliacaoId: string,
  input: { acao: "aceitar" | "vincular" | "rejeitar"; observacao: string; transacaoExtratoId?: string }
) {
  const { data } = await api.patch(`/conciliacao/${conciliacaoId}/resolver`, input);
  return data;
}

export interface TaxaContratada {
  id: string;
  bandeira: Bandeira;
  modalidade: ModalidadeCartao;
  parcelas: number;
  taxaPercentual: string;
  vigenteDesde: string;
}

export async function listarTaxas() {
  const { data } = await api.get<TaxaContratada[]>("/conciliacao/taxas");
  return data;
}

export async function definirTaxa(input: { bandeira: Bandeira; modalidade: ModalidadeCartao; parcelas: number; taxaPercentual: number }) {
  const { data } = await api.post<TaxaContratada>("/conciliacao/taxas", input);
  return data;
}

export async function agendaRecebiveis(dataInicio: string, dataFim: string) {
  const { data } = await api.get("/conciliacao/recebiveis", { params: { dataInicio, dataFim } });
  return data as { data: string; valorPrevisto: string; quantidade: number }[];
}
