import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import type { AtualizarServicoInput, CriarServicoInput } from "./servicos.schemas";

interface ContextoRequisicao {
  usuarioId: string;
  lojaId: string;
}

export async function listar(lojaId: string, incluirInativos: boolean) {
  return prisma.servico.findMany({
    where: { lojaId, ...(incluirInativos ? {} : { ativo: true }) },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
}

export async function criar(input: CriarServicoInput, ctx: ContextoRequisicao) {
  const servico = await prisma.servico.create({ data: { ...input, lojaId: ctx.lojaId } });
  await auditoriaService.registrar({
    lojaId: ctx.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "SERVICO_ALTERADO",
    entidade: "Servico",
    entidadeId: servico.id,
    detalhes: { operacao: "criado", ...input },
  });
  return servico;
}

export async function atualizar(id: string, input: AtualizarServicoInput, ctx: ContextoRequisicao) {
  const atual = await prisma.servico.findFirst({ where: { id, lojaId: ctx.lojaId } });
  if (!atual) throw new AppError("Serviço não encontrado.", 404);

  // Serviço nunca é apagado: agendamentos antigos continuam apontando para ele.
  const servico = await prisma.servico.update({ where: { id }, data: input });
  await auditoriaService.registrar({
    lojaId: ctx.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "SERVICO_ALTERADO",
    entidade: "Servico",
    entidadeId: id,
    detalhes: { operacao: "atualizado", alteracoes: input },
  });
  return servico;
}
