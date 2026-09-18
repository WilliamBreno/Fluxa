import { z } from "zod";
import { RoleUsuario } from "@prisma/client";

export const criarUsuarioSchema = z.object({
  nome: z.string().min(2).max(150),
  email: z.string().email(),
  senha: z.string().min(6).max(100),
  roleGlobal: z.nativeEnum(RoleUsuario),
  superAdmin: z.boolean().default(false),
  lojaId: z.string().uuid().optional(),
});

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2).max(150).optional(),
  roleGlobal: z.nativeEnum(RoleUsuario).optional(),
  ativo: z.boolean().optional(),
  novaSenha: z.string().min(6).max(100).optional(),
});

export const vincularLojaSchema = z.object({
  lojaId: z.string().uuid(),
  role: z.nativeEnum(RoleUsuario),
});
