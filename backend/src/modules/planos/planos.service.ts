import { prisma } from "../../lib/prisma";
import type { Prisma } from "@prisma/client";

export async function listarAtivos() {
  return prisma.plano.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } });
}

export async function listarTodos() {
  return prisma.plano.findMany({ orderBy: { ordem: "asc" } });
}

export async function criar(input: Prisma.PlanoCreateInput) {
  return prisma.plano.create({ data: input });
}

export async function atualizar(id: string, input: Prisma.PlanoUpdateInput) {
  return prisma.plano.update({ where: { id }, data: input });
}

export async function remover(id: string) {
  await prisma.plano.update({ where: { id }, data: { ativo: false } });
}
