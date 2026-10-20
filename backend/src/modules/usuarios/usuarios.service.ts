import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import { roleAtendeMinimo, type RoleUsuarioKey } from "../../config/constants";
import type { RoleUsuario } from "@prisma/client";

interface ContextoRequisicao {
  usuarioId: string;
  /** Loja selecionada (x-loja-id), já validada pelo requireAuth/requireLoja. */
  lojaId: string;
  /** Papel do chamador nessa loja. */
  roleNaLoja?: RoleUsuario;
  superAdmin: boolean;
}

interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  roleGlobal: RoleUsuario;
  superAdmin?: boolean;
  lojaId?: string;
}

/**
 * Regra de concessão: fora a equipe Fluxa (superAdmin), ninguém atribui papel
 * acima do seu próprio na loja nem mexe em vínculos de outra loja. Sem isso,
 * qualquer GERENTE criado pelo cadastro público virava ADMIN/superAdmin de
 * qualquer loja.
 */
function garantirPodeConceder(ctx: ContextoRequisicao, lojaAlvo: string, role: RoleUsuario) {
  if (ctx.superAdmin) return;
  if (lojaAlvo !== ctx.lojaId) throw new AppError("Sem permissão para gerenciar usuários de outra loja.", 403);
  if (!ctx.roleNaLoja || !roleAtendeMinimo(ctx.roleNaLoja as RoleUsuarioKey, role as RoleUsuarioKey)) {
    throw new AppError("Não é possível atribuir um perfil acima do seu.", 403);
  }
}

/** Revoga todas as sessões (refresh tokens) ativas do usuário. */
async function revogarSessoes(usuarioId: string) {
  await prisma.refreshToken.updateMany({ where: { usuarioId, revogadoEm: null }, data: { revogadoEm: new Date() } });
}

export async function criar(input: CriarUsuarioInput, ctx: ContextoRequisicao) {
  if (input.superAdmin && !ctx.superAdmin) {
    throw new AppError("Somente a equipe Fluxa pode criar usuários superAdmin.", 403);
  }
  // O novo usuário entra sempre na loja selecionada; outra loja só para superAdmin.
  const lojaAlvo = input.lojaId ?? ctx.lojaId;
  garantirPodeConceder(ctx, lojaAlvo, input.roleGlobal);

  const existente = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existente) throw new AppError("Já existe um usuário com este e-mail.", 409);

  const senhaHash = await bcrypt.hash(input.senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nome: input.nome,
      email: input.email,
      senhaHash,
      roleGlobal: input.roleGlobal,
      superAdmin: ctx.superAdmin ? input.superAdmin ?? false : false,
      lojas: { create: { lojaId: lojaAlvo, role: input.roleGlobal } },
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

export async function listar(lojaId: string) {
  // Sempre restrito à loja selecionada: nunca lista usuários de todas as lojas.
  return prisma.usuario.findMany({
    where: { lojas: { some: { lojaId, ativo: true } } },
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
  // Só usuários da loja selecionada (superAdmin gerencia qualquer um).
  const usuario = await prisma.usuario.findFirst({
    where: ctx.superAdmin ? { id: usuarioId } : { id: usuarioId, lojas: { some: { lojaId: ctx.lojaId } } },
    include: { lojas: { where: { ativo: true } } },
  });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);
  if (!ctx.superAdmin) {
    if (usuario.superAdmin) throw new AppError("Sem permissão para alterar este usuário.", 403);
    // Senha, ativação e perfil global valem em todas as lojas da pessoa: se ela
    // também está em outra loja, alterar isso daqui afetaria (ou tomaria) a outra.
    const emOutraLoja = usuario.lojas.some((v) => v.lojaId !== ctx.lojaId);
    if (emOutraLoja && (input.novaSenha || input.ativo !== undefined || input.roleGlobal)) {
      throw new AppError("Este usuário também está vinculado a outra loja; peça a alteração ao suporte Fluxa.", 403);
    }
    // Não altera quem tem perfil acima do seu, nem promove alguém acima de você.
    const roleAlvo = usuario.lojas.find((v) => v.lojaId === ctx.lojaId)?.role ?? usuario.roleGlobal;
    garantirPodeConceder(ctx, ctx.lojaId, roleAlvo);
    if (input.roleGlobal) garantirPodeConceder(ctx, ctx.lojaId, input.roleGlobal);
  }

  const senhaHash = input.novaSenha ? await bcrypt.hash(input.novaSenha, 10) : undefined;

  const atualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { nome: input.nome, roleGlobal: input.roleGlobal, ativo: input.ativo, senhaHash },
    select: { id: true, nome: true, email: true, roleGlobal: true, ativo: true },
  });

  // Troca de senha ou desativação encerra as sessões abertas do usuário.
  if (input.novaSenha || input.ativo === false) await revogarSessoes(usuarioId);

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

export async function vincularLoja(usuarioId: string, lojaId: string, role: RoleUsuario, ctx: ContextoRequisicao) {
  garantirPodeConceder(ctx, lojaId, role);
  const vinculo = await prisma.usuarioLoja.upsert({
    where: { usuarioId_lojaId: { usuarioId, lojaId } },
    create: { usuarioId, lojaId, role },
    update: { role, ativo: true },
  });
  await auditoriaService.registrar({
    lojaId,
    usuarioId: ctx.usuarioId,
    acao: "USUARIO_ATUALIZADO",
    entidade: "UsuarioLoja",
    entidadeId: vinculo.id,
    detalhes: { usuarioVinculadoId: usuarioId, role },
  });
  return vinculo;
}
