import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { listarAuditoriaQuerySchema } from "./auditoria.schemas";
import { listarAuditoria } from "./auditoria.controller";

export const auditoriaRoutes = Router();

// Somente leitura — não existe (e nunca deve existir) rota de escrita aqui.
auditoriaRoutes.get(
  "/",
  requireAuth,
  requireRole("SUPERVISOR"),
  validateQuery(listarAuditoriaQuerySchema),
  asyncHandler(async (req, res) => listarAuditoria(req, res))
);
