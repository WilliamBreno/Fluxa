import { api } from "./client";
import type { Agendamento, StatusAgendamento } from "./agendamentos.api";

export interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  dataNascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  origem: string | null;
  tags: string[];
  observacoes: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteListado extends Cliente {
  ultimaVisita: string | null;
  atendimentos: number;
  proximo: string | null;
}

export interface ClienteDetalhe extends Cliente {
  criadoPor: { id: string; nome: string };
  estatisticas: {
    totalAgendamentos: number;
    concluidos: number;
    faltas: number;
    cancelados: number;
    taxaFaltas: number;
    totalGasto: string;
    ticketMedio: string;
    ultimaVisita: string | null;
    ultimoServico: string | null;
    proximoAgendamento: { id: string; inicio: string; status: StatusAgendamento; servico: { nome: string } | null } | null;
  };
}

export interface ClienteResumido {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  tags: string[];
}

export interface NotaCliente {
  id: string;
  texto: string;
  createdAt: string;
  autor: { id: string; nome: string };
}

export type ClienteInput = Partial<Omit<Cliente, "id" | "ativo" | "createdAt" | "updatedAt">> & { nome: string };

export interface FiltrosClientes {
  busca?: string;
  tag?: string;
  status?: "ativos" | "inativos" | "todos";
  ordenar?: "nome" | "recentes" | "ultimaVisita";
  pagina?: number;
  tamanhoPagina?: number;
}

function limparParams(filtros: FiltrosClientes) {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ""));
}

export async function listarClientes(filtros: FiltrosClientes) {
  const { data } = await api.get<{ itens: ClienteListado[]; total: number; pagina: number; tamanhoPagina: number }>(
    "/clientes",
    { params: limparParams(filtros) }
  );
  return data;
}

export async function buscarClientes(q: string) {
  const { data } = await api.get<ClienteResumido[]>("/clientes/busca", { params: { q } });
  return data;
}

export async function listarTags() {
  const { data } = await api.get<{ tag: string; total: number }[]>("/clientes/tags");
  return data;
}

export async function obterCliente(id: string) {
  const { data } = await api.get<ClienteDetalhe>(`/clientes/${id}`);
  return data;
}

export async function criarCliente(input: ClienteInput) {
  const { data } = await api.post<Cliente>("/clientes", input);
  return data;
}

export async function atualizarCliente(id: string, input: Partial<ClienteInput & { ativo: boolean }>) {
  const { data } = await api.patch<Cliente>(`/clientes/${id}`, input);
  return data;
}

export async function historicoCliente(id: string) {
  const { data } = await api.get<Agendamento[]>(`/clientes/${id}/agendamentos`);
  return data;
}

export async function listarNotas(id: string) {
  const { data } = await api.get<NotaCliente[]>(`/clientes/${id}/notas`);
  return data;
}

export async function criarNota(id: string, texto: string) {
  const { data } = await api.post<NotaCliente>(`/clientes/${id}/notas`, { texto });
  return data;
}

/** Download via blob: a rota exige Bearer + x-loja-id, que um link direto não enviaria. */
export async function exportarClientes(filtros: FiltrosClientes) {
  const resposta = await api.get("/clientes/exportar", { params: limparParams(filtros), responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
