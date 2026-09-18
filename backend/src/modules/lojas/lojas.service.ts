import { prisma } from "../../lib/prisma";

interface CriarLojaInput {
  nome: string;
  cnpj?: string;
  endereco?: string;
  timezone: string;
}

export async function criar(input: CriarLojaInput) {
  return prisma.loja.create({
    data: {
      ...input,
      configuracao: { create: {} }, // valores default (teto R$500, tolerância R$5 etc.)
    },
    include: { configuracao: true },
  });
}

export async function listarMinhas(usuarioId: string, superAdmin: boolean) {
  if (superAdmin) {
    return prisma.loja.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  }
  return prisma.loja.findMany({
    where: { ativo: true, usuarios: { some: { usuarioId, ativo: true } } },
    orderBy: { nome: "asc" },
  });
}
