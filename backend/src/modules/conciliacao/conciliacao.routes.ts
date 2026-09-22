import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  confirmarMapeamentoBodySchema,
  definirTaxaSchema,
  executarConciliacaoSchema,
  listarConciliacoesQuerySchema,
  periodoQuerySchema,
  resolverManualSchema,
  uploadExtratoSchema,
} from "./conciliacao.schemas";
import {
  alertasTaxaController,
  confirmarMapeamentoController,
  definirTaxaController,
  executarConciliacaoController,
  listarConciliacoesController,
  listarExtratosController,
  listarTaxasController,
  listarTransacoesController,
  recebiveisController,
  resolverManualController,
  resumoController,
  uploadExtratoController,
} from "./conciliacao.controller";

export const conciliacaoRoutes = Router();
conciliacaoRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva, requireRole("SUPERVISOR"));

conciliacaoRoutes.post("/extratos", validateBody(uploadExtratoSchema), asyncHandler(uploadExtratoController));
conciliacaoRoutes.post(
  "/extratos/:id/mapeamento",
  validateBody(confirmarMapeamentoBodySchema),
  asyncHandler(confirmarMapeamentoController)
);
conciliacaoRoutes.get("/extratos", asyncHandler(listarExtratosController));
conciliacaoRoutes.get("/extratos/:id/transacoes", asyncHandler(listarTransacoesController));

conciliacaoRoutes.post(
  "/executar",
  validateBody(executarConciliacaoSchema),
  asyncHandler(executarConciliacaoController)
);
conciliacaoRoutes.get("/", validateQuery(listarConciliacoesQuerySchema), asyncHandler(listarConciliacoesController));
conciliacaoRoutes.get("/resumo", asyncHandler(resumoController));
conciliacaoRoutes.patch(
  "/:id/resolver",
  requireRole("GERENTE"),
  validateBody(resolverManualSchema),
  asyncHandler(resolverManualController)
);

conciliacaoRoutes.get("/taxas", asyncHandler(listarTaxasController));
conciliacaoRoutes.post("/taxas", requireRole("GERENTE"), validateBody(definirTaxaSchema), asyncHandler(definirTaxaController));
conciliacaoRoutes.get("/taxas/alertas", requireRole("GERENTE"), validateQuery(periodoQuerySchema), asyncHandler(alertasTaxaController));
conciliacaoRoutes.get("/recebiveis", validateQuery(periodoQuerySchema), asyncHandler(recebiveisController));
