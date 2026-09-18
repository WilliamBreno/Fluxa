import { Router } from "express";
import { requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  comparativoQuerySchema,
  exportacaoContabilQuerySchema,
  formatoExportacaoSchema,
} from "./relatorios.schemas";
import {
  alertasDivergenciaController,
  buscarFechamentoController,
  comparativoController,
  exportacaoContabilController,
  previsaoController,
} from "./relatorios.controller";

export const relatoriosRoutes = Router();
relatoriosRoutes.use(requireAuth, requireLoja, requireRole("SUPERVISOR"));

relatoriosRoutes.get(
  "/fechamento/:turnoId",
  validateQuery(formatoExportacaoSchema),
  asyncHandler(buscarFechamentoController)
);
relatoriosRoutes.get("/comparativo", validateQuery(comparativoQuerySchema), asyncHandler(comparativoController));
relatoriosRoutes.get("/alertas-divergencia", asyncHandler(alertasDivergenciaController));
relatoriosRoutes.get("/previsao", requireRole("GERENTE"), asyncHandler(previsaoController));
relatoriosRoutes.get(
  "/exportacao-contabil",
  requireRole("GERENTE"),
  validateQuery(exportacaoContabilQuerySchema),
  asyncHandler(exportacaoContabilController)
);
