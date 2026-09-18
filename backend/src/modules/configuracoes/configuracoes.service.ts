import { prisma } from "../../lib/prisma";
import * as auditoriaService from "../auditoria/auditoria.service";

export async function obter(lojaId: string) {
  return prisma.configuracaoLoja.upsert({
    where: { lojaId },
    create: { lojaId },
    update: {},
  });
}

export async function atualizar(
  lojaId: string,
  input: Record<string, unknown>,
  ctx: { usuarioId: string }
) {
  const configuracao = await prisma.configuracaoLoja.upsert({
    where: { lojaId },
    create: { lojaId, ...input },
    update: input,
  });

  await auditoriaService.registrar({
    lojaId,
    usuarioId: ctx.usuarioId,
    acao: "ALTERACAO_CONFIG",
    entidade: "ConfiguracaoLoja",
    entidadeId: configuracao.id,
    detalhes: input,
  });

  return configuracao;
}
