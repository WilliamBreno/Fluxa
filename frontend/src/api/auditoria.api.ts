import { api } from "./client";

export interface RegistroAuditoria {
  id: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  detalhesJson: unknown;
  createdAt: string;
  usuario: { id: string; nome: string; email: string } | null;
}

export async function listarAuditoria(params?: {
  usuarioId?: string;
  acao?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
}) {
  const { data } = await api.get("/auditoria", { params });
  return data as { itens: RegistroAuditoria[]; total: number; pagina: number; tamanhoPagina: number };
}
