import { api } from "./client";

export interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  funcionalidades: string[];
  valorMensal: string;
  valorAnual: string;
  limiteTerminais: number | null;
  ordem: number;
  ativo: boolean;
}

export async function listar() {
  const { data } = await api.get<Plano[]>("/planos");
  return data;
}

export async function listarAdmin() {
  const { data } = await api.get<Plano[]>("/planos/admin");
  return data;
}

export interface PlanoInput {
  nome: string;
  descricao?: string;
  funcionalidades: string[];
  valorMensal: number;
  valorAnual: number;
  limiteTerminais: number | null;
  ordem: number;
  ativo?: boolean;
}

export async function criar(input: PlanoInput) {
  const { data } = await api.post<Plano>("/planos", input);
  return data;
}

export async function atualizar(id: string, input: Partial<PlanoInput>) {
  const { data } = await api.patch<Plano>(`/planos/${id}`, input);
  return data;
}

export async function remover(id: string) {
  await api.delete(`/planos/${id}`);
}
