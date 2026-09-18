import { api } from "./client";
import type { FormaPagamento } from "./turnos.api";

export type TipoMovimentacao = "VENDA" | "SANGRIA" | "SUPRIMENTO" | "CANCELAMENTO" | "DEVOLUCAO" | "AJUSTE";

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  formaPagamento: FormaPagamento | null;
  valor: string;
  motivo: string | null;
  status: "ATIVA" | "PENDENTE_CONFERENCIA" | "ESTORNADA";
  createdAt: string;
  operador: { id: string; nome: string };
  conferidoPor: { id: string; nome: string } | null;
}

export async function criarMovimentacao(
  turnoId: string,
  input: {
    tipo: TipoMovimentacao;
    formaPagamento?: FormaPagamento;
    valor: number;
    motivo?: string;
    descricao?: string;
    vendaReferenciaId?: string;
  }
) {
  const { data } = await api.post<Movimentacao>(`/turnos/${turnoId}/movimentacoes`, input);
  return data;
}

export async function listarMovimentacoes(turnoId: string) {
  const { data } = await api.get<Movimentacao[]>(`/turnos/${turnoId}/movimentacoes`);
  return data;
}

export async function conferirMovimentacao(movimentacaoId: string) {
  await api.patch(`/movimentacoes/${movimentacaoId}/conferir`);
}
