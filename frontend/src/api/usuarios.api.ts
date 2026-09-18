import { api } from "./client";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  roleGlobal: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
  ativo: boolean;
  lojas: { lojaId: string; role: string; loja: { nome: string } }[];
}

export async function listarUsuarios() {
  const { data } = await api.get<Usuario[]>("/usuarios");
  return data;
}

export async function criarUsuario(input: {
  nome: string;
  email: string;
  senha: string;
  roleGlobal: Usuario["roleGlobal"];
  lojaId?: string;
}) {
  const { data } = await api.post<Usuario>("/usuarios", input);
  return data;
}

export async function atualizarUsuario(
  id: string,
  input: Partial<{ nome: string; roleGlobal: Usuario["roleGlobal"]; ativo: boolean; novaSenha: string }>
) {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, input);
  return data;
}
