import type { AcaoAuditoria, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

interface RegistrarAuditoriaInput {
  lojaId?: string;
  usuarioId?: string;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Único ponto de escrita do log de auditoria. Não existe rota de update/delete
 * para AuditLog em nenhum módulo — correção de um erro de registro nunca é
 * possível, só um novo registro relatando o fato.
 */
export async function registrar(
  input: RegistrarAuditoriaInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  await tx.auditLog.create({
    data: {
      lojaId: input.lojaId,
      usuarioId: input.usuarioId,
      acao: input.acao,
      entidade: input.entidade,
      entidadeId: input.entidadeId,
      detalhesJson: input.detalhes as Prisma.InputJsonValue | undefined,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}

interface ListarAuditoriaFiltros {
  lojaId?: string;
  usuarioId?: string;
  acao?: AcaoAuditoria;
  dataInicio?: Date;
  dataFim?: Date;
  pagina: number;
  tamanhoPagina: number;
}

export async function listar(filtros: ListarAuditoriaFiltros) {
  const where: Prisma.AuditLogWhereInput = {
    lojaId: filtros.lojaId,
    usuarioId: filtros.usuarioId,
    acao: filtros.acao,
    createdAt:
      filtros.dataInicio || filtros.dataFim
        ? { gte: filtros.dataInicio, lte: filtros.dataFim }
        : undefined,
  };

  const [itens, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { usuario: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filtros.pagina - 1) * filtros.tamanhoPagina,
      take: filtros.tamanhoPagina,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { itens, total, pagina: filtros.pagina, tamanhoPagina: filtros.tamanhoPagina };
}
