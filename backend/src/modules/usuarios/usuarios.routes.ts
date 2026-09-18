import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
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
usuariosRoutes.use(requireAuth);

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
