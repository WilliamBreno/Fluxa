import { api } from "./client";

export type StatusAgendamento = "AGENDADO" | "CONFIRMADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO" | "FALTOU";

export interface Agendamento {
  id: string;
  clienteId: string;
  servicoId: string | null;
  profissionalId: string | null;
  inicio: string;
  fim: string;
  status: StatusAgendamento;
  valor: string | null;
  observacoes: string | null;
  motivoCancelamento: string | null;
  confirmadoEm: string | null;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  canceladoEm: string | null;
  createdAt: string;
  cliente: { id: string; nome: string; telefone: string | null; tags: string[] };
  servico: { id: string; nome: string; cor: string; duracaoMinutos?: number } | null;
  profissional: { id: string; nome: string } | null;
  criadoPor?: { id: string; nome: string };
}

export interface AgendamentoDetalhe extends Agendamento {
  historico: { id: string; acao: string; createdAt: string; detalhesJson: Record<string, unknown> | null; usuario: { nome: string } | null }[];
}

export interface ResumoAgenda {
  total: number;
  porStatus: Partial<Record<StatusAgendamento, number>>;
  receitaPrevista: string;
  receitaRealizada: string;
  taxaFaltas: number;
}

export interface Profissional {
  id: string;
  nome: string;
  role: string;
}

export interface AgendamentoInput {
  clienteId: string;
  servicoId?: string | null;
  profissionalId?: string | null;
  inicio: string;
  fim: string;
  valor?: number | null;
  observacoes?: string | null;
}

export async function listarAgendamentos(params: { inicio: string; fim: string; profissionalId?: string; status?: string }) {
  const { data } = await api.get<Agendamento[]>("/agendamentos", { params });
  return data;
}

export async function resumoAgenda(params: { inicio: string; fim: string }) {
  const { data } = await api.get<ResumoAgenda>("/agendamentos/resumo", { params });
  return data;
}

export async function listarProfissionais() {
  const { data } = await api.get<Profissional[]>("/agendamentos/profissionais");
  return data;
}

export async function obterAgendamento(id: string) {
  const { data } = await api.get<AgendamentoDetalhe>(`/agendamentos/${id}`);
  return data;
}

export async function criarAgendamento(input: AgendamentoInput) {
  const { data } = await api.post<Agendamento>("/agendamentos", input);
  return data;
}

export async function atualizarAgendamento(id: string, input: Partial<Omit<AgendamentoInput, "clienteId">>) {
  const { data } = await api.patch<Agendamento>(`/agendamentos/${id}`, input);
  return data;
}

export async function alterarStatus(id: string, status: StatusAgendamento, motivo?: string) {
  const { data } = await api.post<Agendamento>(`/agendamentos/${id}/status`, { status, motivo });
  return data;
}
