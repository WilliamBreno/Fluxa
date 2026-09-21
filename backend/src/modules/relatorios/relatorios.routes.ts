import { Router } from "express";
import { requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  comparativoQuerySchema,
  estornosQuerySchema,
  exportacaoContabilQuerySchema,
  formatoExportacaoSchema,
  movimentacoesFiltradasQuerySchema,
  periodoOpcionalQuerySchema,
  vendasPorFormaQuerySchema,
} from "./relatorios.schemas";
import {
  alertasDivergenciaController,
  buscarFechamentoController,
  comparativoController,
  divergenciaPorOperadorController,
  estornosController,
  exportacaoContabilController,
  movimentacoesFiltradasController,
  previsaoController,
  vendasPorFormaController,
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
relatoriosRoutes.get(
  "/divergencia-por-operador",
  validateQuery(periodoOpcionalQuerySchema),
  asyncHandler(divergenciaPorOperadorController)
);
relatoriosRoutes.get(
  "/vendas-por-forma",
  validateQuery(vendasPorFormaQuerySchema),
  asyncHandler(vendasPorFormaController)
);
relatoriosRoutes.get(
  "/movimentacoes",
  validateQuery(movimentacoesFiltradasQuerySchema),
  asyncHandler(movimentacoesFiltradasController)
);
relatoriosRoutes.get("/estornos", validateQuery(estornosQuerySchema), asyncHandler(estornosController));
relatoriosRoutes.get("/previsao", requireRole("GERENTE"), asyncHandler(previsaoController));
relatoriosRoutes.get(
  "/exportacao-contabil",
  requireRole("GERENTE"),
  validateQuery(exportacaoContabilQuerySchema),
  asyncHandler(exportacaoContabilController)
);
