import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../middlewares/errorHandler";
import { fluxoCaixaController, kpisController, ultimosLancamentosController } from "./dashboard.controller";

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva, requireRole("SUPERVISOR"));

dashboardRoutes.get("/kpis", asyncHandler(kpisController));
dashboardRoutes.get("/fluxo-caixa", asyncHandler(fluxoCaixaController));
dashboardRoutes.get("/ultimos-lancamentos", asyncHandler(ultimosLancamentosController));
