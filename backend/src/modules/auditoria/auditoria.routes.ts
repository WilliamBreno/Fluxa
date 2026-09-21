import { Router } from "express";
import { requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { listarAuditoriaQuerySchema } from "./auditoria.schemas";
import { exportarAuditoria, listarAuditoria } from "./auditoria.controller";

export const auditoriaRoutes = Router();
auditoriaRoutes.use(requireAuth, requireLoja, requireRole("SUPERVISOR"));

// Somente leitura — não existe (e nunca deve existir) rota de escrita aqui.
auditoriaRoutes.get("/", validateQuery(listarAuditoriaQuerySchema), asyncHandler(listarAuditoria));
auditoriaRoutes.get("/exportar", validateQuery(listarAuditoriaQuerySchema), asyncHandler(exportarAuditoria));
