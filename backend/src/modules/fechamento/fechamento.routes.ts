import { Router } from "express";
import { requireAuth, requireLoja } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { confirmarFechamentoSchema, registrarContagemSchema } from "./fechamento.schemas";
import {
  confirmarController,
  iniciarController,
  obterDivergenciaController,
  registrarContagemController,
} from "./fechamento.controller";

/** Montado em /api/turnos/:id/fechamento. */
export const fechamentoRoutes = Router({ mergeParams: true });
fechamentoRoutes.use(requireAuth, requireLoja);

fechamentoRoutes.post("/iniciar", asyncHandler(iniciarController));
fechamentoRoutes.post(
  "/contagem",
  validateBody(registrarContagemSchema),
  asyncHandler(registrarContagemController)
);
fechamentoRoutes.get("/divergencia", asyncHandler(obterDivergenciaController));
fechamentoRoutes.post(
  "/confirmar",
  validateBody(confirmarFechamentoSchema),
  asyncHandler(confirmarController)
);
