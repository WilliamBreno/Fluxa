import { Router } from "express";
import { requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { atualizarUsuarioSchema, criarUsuarioSchema, vincularLojaSchema } from "./usuarios.schemas";
import {
  atualizarUsuarioController,
  criarUsuarioController,
  listarUsuariosController,
  vincularLojaController,
} from "./usuarios.controller";

export const usuariosRoutes = Router();
// requireLoja obrigatório: sem x-loja-id, requireRole cairia no roleGlobal e as
// operações deixariam de ser presas a uma loja. Toda gestão de usuários é feita
// dentro da loja selecionada, com o papel que o usuário tem nela.
usuariosRoutes.use(requireAuth, requireLoja);

usuariosRoutes.get("/", requireRole("SUPERVISOR"), asyncHandler(listarUsuariosController));
usuariosRoutes.post(
  "/",
  requireRole("GERENTE"),
  validateBody(criarUsuarioSchema),
  asyncHandler(criarUsuarioController)
);
usuariosRoutes.patch(
  "/:id",
  requireRole("GERENTE"),
  validateBody(atualizarUsuarioSchema),
  asyncHandler(atualizarUsuarioController)
);
usuariosRoutes.post(
  "/:id/lojas",
  requireRole("ADMIN"),
  validateBody(vincularLojaSchema),
  asyncHandler(vincularLojaController)
);
