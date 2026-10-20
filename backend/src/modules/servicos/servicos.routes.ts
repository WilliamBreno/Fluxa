import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { atualizarServicoSchema, criarServicoSchema } from "./servicos.schemas";
import { atualizarServicoController, criarServicoController, listarServicosController } from "./servicos.controller";

export const servicosRoutes = Router();
servicosRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);

servicosRoutes.get("/", asyncHandler(listarServicosController));
servicosRoutes.post("/", requireRole("GERENTE"), validateBody(criarServicoSchema), asyncHandler(criarServicoController));
servicosRoutes.patch(
  "/:id",
  requireRole("GERENTE"),
  validateBody(atualizarServicoSchema),
  asyncHandler(atualizarServicoController)
);
