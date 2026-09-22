import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { criarTerminalSchema } from "./terminais.schemas";
import { criarTerminalController, listarTerminaisController } from "./terminais.controller";

export const terminaisRoutes = Router();
terminaisRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);

terminaisRoutes.get("/", asyncHandler(listarTerminaisController));
terminaisRoutes.post(
  "/",
  requireRole("GERENTE"),
  validateBody(criarTerminalSchema),
  asyncHandler(criarTerminalController)
);
