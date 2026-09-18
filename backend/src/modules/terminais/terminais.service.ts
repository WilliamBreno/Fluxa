import { prisma } from "../../lib/prisma";

export async function criar(lojaId: string, input: { codigo: string; nome: string }) {
  return prisma.terminal.create({ data: { lojaId, ...input } });
}

export async function listar(lojaId: string) {
  return prisma.terminal.findMany({
    where: { lojaId, ativo: true },
    orderBy: { codigo: "asc" },
    include: {
      turnos: {
        where: { status: "ABERTO" },
        take: 1,
        select: { id: true, operadorResponsavelAtual: { select: { nome: true } }, dataAbertura: true },
      },
    },
  });
}
