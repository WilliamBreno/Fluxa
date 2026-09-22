import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import type { RoleUsuario } from "@prisma/client";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function gerarAccessToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

function parseExpiresInParaData(expiresIn: string): Date {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  const agora = Date.now();
  if (!match) return new Date(agora + 7 * 24 * 60 * 60 * 1000);
  const valor = Number(match[1]);
  const unidadeMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return new Date(agora + valor * unidadeMs);
}

interface LoginInput {
  email: string;
  senha: string;
  lojaId?: string;
  ip?: string;
  userAgent?: string;
}

interface UsuarioComLojas {
  id: string;
  nome: string;
  email: string;
  roleGlobal: RoleUsuario;
  superAdmin: boolean;
  lojas: { lojaId: string; loja: { nome: string }; role: RoleUsuario }[];
}

/**
 * Emite access+refresh token para um usuário já autenticado por outro meio
 * (senha conferida no login, ou conta recém-criada no cadastro público) —
 * evita duplicar a lógica de token entre `login` e `cadastro.service.ts`.
 */
export async function emitirSessao(usuario: UsuarioComLojas, ip?: string) {
  const accessToken = gerarAccessToken(usuario.id);
  const refreshTokenBruto = randomUUID() + randomUUID();
  const expiraEm = parseExpiresInParaData(env.jwtRefreshExpiresIn);

  await prisma.refreshToken.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashToken(refreshTokenBruto),
      expiraEm,
      criadoEmIp: ip,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenBruto,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      roleGlobal: usuario.roleGlobal,
      superAdmin: usuario.superAdmin,
      lojas: usuario.lojas.map((ul) => ({
        lojaId: ul.lojaId,
        nome: ul.loja.nome,
        role: ul.role,
      })),
    },
  };
}

export async function login(input: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: input.email },
    include: { lojas: { include: { loja: true } } },
  });

  if (!usuario || !usuario.ativo) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);
  if (!senhaValida) {
    await auditoriaService.registrar({
      usuarioId: usuario.id,
      acao: "LOGIN_FALHO",
      entidade: "Usuario",
      entidadeId: usuario.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const sessao = await emitirSessao(usuario, input.ip);

  await auditoriaService.registrar({
    lojaId: input.lojaId,
    usuarioId: usuario.id,
    acao: "LOGIN",
    entidade: "Usuario",
    entidadeId: usuario.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return sessao;
}

export async function refresh(refreshTokenBruto: string, ip?: string) {
  const tokenHash = hashToken(refreshTokenBruto);
  const registro = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!registro || registro.revogadoEm || registro.expiraEm < new Date()) {
    throw new AppError("Sessão expirada, faça login novamente.", 401);
  }

  const novoRefreshBruto = randomUUID() + randomUUID();
  const novaExpiracao = parseExpiresInParaData(env.jwtRefreshExpiresIn);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogadoEm: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        usuarioId: registro.usuarioId,
        tokenHash: hashToken(novoRefreshBruto),
        expiraEm: novaExpiracao,
        criadoEmIp: ip,
      },
    }),
  ]);

  return {
    accessToken: gerarAccessToken(registro.usuarioId),
    refreshToken: novoRefreshBruto,
  };
}

export async function me(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { lojas: { include: { loja: true } } },
  });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    roleGlobal: usuario.roleGlobal,
    superAdmin: usuario.superAdmin,
    lojas: usuario.lojas.map((ul) => ({ lojaId: ul.lojaId, nome: ul.loja.nome, role: ul.role })),
  };
}

export async function logout(refreshTokenBruto: string, usuarioId?: string) {
  const tokenHash = hashToken(refreshTokenBruto);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revogadoEm: null },
    data: { revogadoEm: new Date() },
  });
  if (usuarioId) {
    await auditoriaService.registrar({ usuarioId, acao: "LOGOUT", entidade: "Usuario", entidadeId: usuarioId });
  }
}
