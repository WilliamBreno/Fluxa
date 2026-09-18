import { api } from "./client";

export interface Loja {
  id: string;
  nome: string;
  cnpj: string | null;
}

export async function listarMinhasLojas() {
  const { data } = await api.get<Loja[]>("/lojas");
  return data;
}
