import { api } from "./client";

export interface LojaDoUsuario {
  lojaId: string;
  nome: string;
  role: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
}

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  roleGlobal: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
  superAdmin: boolean;
  lojas: LojaDoUsuario[];
}

export async function login(email: string, senha: string) {
  const { data } = await api.post<{ accessToken: string; usuario: UsuarioLogado }>("/auth/login", {
    email,
    senha,
  });
  return data;
}

export async function refresh() {
  const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
  return data;
}

export async function me() {
  const { data } = await api.get<UsuarioLogado>("/auth/me");
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}
