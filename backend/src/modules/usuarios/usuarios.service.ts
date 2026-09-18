import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import type { RoleUsuario } from "@prisma/client";

interface ContextoRequisicao {
  usuarioId: string;
  lojaId?: string;
}

interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  roleGlobal: RoleUsuario;
  superAdmin: boolean;
  lojaId?: string;
}

export async function criar(input: CriarUsuarioInput, ctx: ContextoRequisicao) {
  const existente = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existente) throw new AppError("Já existe um usuário com este e-mail.", 409);

  const senhaHash = await bcrypt.hash(input.senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nome: input.nome,
      email: input.email,
      senhaHash,
      roleGlobal: input.roleGlobal,
      superAdmin: input.superAdmin,
      lojas: input.lojaId
        ? { create: { lojaId: input.lojaId, role: input.roleGlobal } }
        : undefined,
    },
    select: { id: true, nome: true, email: true, roleGlobal: true, superAdmin: true, ativo: true },
  });

  await auditoriaService.registrar({
    lojaId: ctx.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "USUARIO_CRIADO",
    entidade: "Usuario",
    entidadeId: usuario.id,
    detalhes: { email: input.email, roleGlobal: input.roleGlobal },
  });

  return usuario;
}

export async function listar(lojaId?: string) {
  return prisma.usuario.findMany({
    where: lojaId ? { lojas: { some: { lojaId, ativo: true } } } : undefined,
    select: {
      id: true,
      nome: true,
      email: true,
      roleGlobal: true,
      superAdmin: true,
      ativo: true,
      lojas: { select: { lojaId: true, role: true, loja: { select: { nome: true } } } },
    },
    orderBy: { nome: "asc" },
  });
}

interface AtualizarUsuarioInput {
  nome?: string;
  roleGlobal?: RoleUsuario;
  ativo?: boolean;
  novaSenha?: string;
}

export async function atualizar(usuarioId: string, input: AtualizarUsuarioInput, ctx: ContextoRequisicao) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);

  const senhaHash = input.novaSenha ? await bcrypt.hash(input.novaSenha, 10) : undefined;

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { nome: input.nome, roleGlobal: input.roleGlobal, ativo: input.ativo, senhaHash },
    select: { id: true, nome: true, email: true, roleGlobal: true, ativo: true },
  });

  await auditoriaService.registrar({
    lojaId: ctx.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "USUARIO_ATUALIZADO",
    entidade: "Usuario",
    entidadeId: usuarioId,
    detalhes: { alteracoes: { ...input, novaSenha: input.novaSenha ? "[alterada]" : undefined } },
  });

  return atualizado;
}

export async function vincularLoja(usuarioId: string, lojaId: string, role: RoleUsuario) {
  return prisma.usuarioLoja.upsert({
    where: { usuarioId_lojaId: { usuarioId, lojaId } },
    create: { usuarioId, lojaId, role },
    update: { role, ativo: true },
  });
}
