import { api } from "./client";
import type { UsuarioLogado } from "./auth.api";

export interface CadastroInput {
  responsavel: { nome: string; email: string; telefone: string; senha: string };
  negocio: { nome: string; documento: string; segmento: string };
}

export async function cadastrar(input: CadastroInput) {
  const { data } = await api.post<{ accessToken: string; usuario: UsuarioLogado; lojaId: string }>(
    "/cadastro",
    input
  );
  return data;
}
