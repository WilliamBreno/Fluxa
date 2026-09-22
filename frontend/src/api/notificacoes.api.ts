import { api } from "./client";

export type SeveridadeNotificacao = "INFO" | "ATENCAO" | "URGENTE";

export interface Notificacao {
  id: string;
  tipo: string;
  severidade: SeveridadeNotificacao;
  titulo: string;
  mensagem: string;
  entidade: string | null;
  entidadeId: string | null;
  lidaEm: string | null;
  createdAt: string;
}

export async function listar(apenasNaoLidas = false) {
  const { data } = await api.get<Notificacao[]>("/notificacoes", { params: { apenasNaoLidas } });
  return data;
}

export async function marcarComoLida(id: string) {
  await api.patch(`/notificacoes/${id}/lida`);
}

export async function marcarTodasComoLidas() {
  await api.post("/notificacoes/marcar-todas-lidas");
}
