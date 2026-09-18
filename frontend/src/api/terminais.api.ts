import { api } from "./client";

export interface Terminal {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  turnos: { id: string; dataAbertura: string; operadorResponsavelAtual: { nome: string } }[];
}

export async function listarTerminais() {
  const { data } = await api.get<Terminal[]>("/terminais");
  return data;
}

export async function criarTerminal(input: { codigo: string; nome: string }) {
  const { data } = await api.post<Terminal>("/terminais", input);
  return data;
}
