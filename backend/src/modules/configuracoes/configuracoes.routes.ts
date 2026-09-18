import { Router } from "express";
import { requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { atualizarConfiguracaoSchema } from "./configuracoes.schemas";
import { atualizarConfiguracaoController, obterConfiguracaoController } from "./configuracoes.controller";

export const configuracoesRoutes = Router();
configuracoesRoutes.use(requireAuth, requireLoja, requireRole("GERENTE"));

configuracoesRoutes.get("/", asyncHandler(obterConfiguracaoController));
configuracoesRoutes.put(
  "/",
  validateBody(atualizarConfiguracaoSchema),
  asyncHandler(atualizarConfiguracaoController)
);
