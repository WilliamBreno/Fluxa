import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { criarMovimentacaoSchema } from "./movimentacoes.schemas";
import {
  conferirMovimentacaoController,
  criarMovimentacaoController,
  listarMovimentacoesController,
} from "./movimentacoes.controller";

/** Montado em /api/turnos/:turnoId/movimentacoes (mergeParams). */
export const movimentacoesPorTurnoRoutes = Router({ mergeParams: true });
movimentacoesPorTurnoRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);
movimentacoesPorTurnoRoutes.get("/", asyncHandler(listarMovimentacoesController));
movimentacoesPorTurnoRoutes.post(
  "/",
  validateBody(criarMovimentacaoSchema),
  asyncHandler(criarMovimentacaoController)
);

/** Montado em /api/movimentacoes. */
export const movimentacoesRoutes = Router();
movimentacoesRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);
movimentacoesRoutes.patch("/:id/conferir", asyncHandler(conferirMovimentacaoController));
