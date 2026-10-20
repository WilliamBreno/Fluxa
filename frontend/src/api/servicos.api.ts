import { api } from "./client";

export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  duracaoMinutos: number;
  preco: string;
  cor: string;
  ativo: boolean;
}

export type ServicoInput = { nome: string; descricao?: string | null; duracaoMinutos: number; preco: number; cor: string };

export async function listarServicos(incluirInativos = false) {
  const { data } = await api.get<Servico[]>("/servicos", { params: incluirInativos ? { incluirInativos: "true" } : {} });
  return data;
}

export async function criarServico(input: ServicoInput) {
  const { data } = await api.post<Servico>("/servicos", input);
  return data;
}

export async function atualizarServico(id: string, input: Partial<ServicoInput & { ativo: boolean }>) {
  const { data } = await api.patch<Servico>(`/servicos/${id}`, input);
  return data;
}
