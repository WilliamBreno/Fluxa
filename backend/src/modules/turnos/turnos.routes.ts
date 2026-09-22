import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  abrirTurnoSchema,
  listarTurnosQuerySchema,
  sugestaoFundoTrocoQuerySchema,
  trocarOperadorSchema,
} from "./turnos.schemas";
import {
  abrirTurnoController,
  buscarTurnoController,
  leituraXController,
  listarTurnosController,
  sugestaoFundoTrocoController,
  trocarOperadorController,
} from "./turnos.controller";

export const turnosRoutes = Router();

turnosRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);

turnosRoutes.get(
  "/sugestao-fundo-troco",
  validateQuery(sugestaoFundoTrocoQuerySchema),
  asyncHandler(sugestaoFundoTrocoController)
);
turnosRoutes.get("/", validateQuery(listarTurnosQuerySchema), asyncHandler(listarTurnosController));
turnosRoutes.get("/:id", asyncHandler(buscarTurnoController));
turnosRoutes.get("/:id/leitura-x", asyncHandler(leituraXController));
turnosRoutes.post("/abrir", validateBody(abrirTurnoSchema), asyncHandler(abrirTurnoController));
turnosRoutes.post(
  "/:id/trocar-operador",
  validateBody(trocarOperadorSchema),
  asyncHandler(trocarOperadorController)
);
