import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { roleAtendeMinimo, type RoleUsuarioKey } from "../config/constants";
import type { RoleUsuario } from "@prisma/client";

interface AccessTokenPayload {
  sub: string;
}

/**
 * Autentica pelo Bearer token e resolve o papel do usuário na loja informada
 * em `x-loja-id`. Isso é o que permite um mesmo usuário ter papéis diferentes
 * em lojas diferentes (ex.: gerente na loja A, operador na loja B).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de acesso ausente." });
  }

  const token = header.slice("Bearer ".length);
  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  } catch {
    return res.status(401).json({ erro: "Token de acesso inválido ou expirado." });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub } });
  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: "Usuário inválido ou inativo." });
  }

  const lojaId = (req.headers["x-loja-id"] as string | undefined) ?? undefined;
  let roleNaLoja: RoleUsuario | undefined;
  if (lojaId) {
    const vinculo = await prisma.usuarioLoja.findUnique({
      where: { usuarioId_lojaId: { usuarioId: usuario.id, lojaId } },
    });
    if (!vinculo || !vinculo.ativo) {
      if (!usuario.superAdmin) {
        return res.status(403).json({ erro: "Usuário sem acesso a esta loja." });
      }
    } else {
      roleNaLoja = vinculo.role;
    }
  }

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    roleGlobal: usuario.roleGlobal,
    superAdmin: usuario.superAdmin,
    lojaId,
    roleNaLoja: roleNaLoja ?? (usuario.superAdmin ? usuario.roleGlobal : undefined),
  };

  next();
}

export function requireRole(minimo: RoleUsuarioKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.usuario?.roleNaLoja ?? req.usuario?.roleGlobal;
    if (!role || !roleAtendeMinimo(role as RoleUsuarioKey, minimo)) {
      return res.status(403).json({ erro: `Ação exige perfil ${minimo} ou superior.` });
    }
    next();
  };
}

export function requireLoja(req: Request, res: Response, next: NextFunction) {
  if (!req.usuario?.lojaId) {
    return res.status(400).json({ erro: "Cabeçalho x-loja-id é obrigatório para esta rota." });
  }
  next();
}
