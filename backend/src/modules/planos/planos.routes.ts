import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { atualizarPlanoSchema, criarPlanoSchema } from "./planos.schemas";
import {
  atualizarController,
  criarController,
  listarAdminController,
  listarController,
  removerController,
} from "./planos.controller";

export const planosRoutes = Router();
planosRoutes.use(requireAuth);

// Lista pública (pra quem está logado) de planos ativos, usada na tela de
// seleção — não passa por requireAssinaturaAtiva de propósito.
planosRoutes.get("/", asyncHandler(listarController));

planosRoutes.get("/admin", requireSuperAdmin, asyncHandler(listarAdminController));
planosRoutes.post("/", requireSuperAdmin, validateBody(criarPlanoSchema), asyncHandler(criarController));
planosRoutes.patch("/:id", requireSuperAdmin, validateBody(atualizarPlanoSchema), asyncHandler(atualizarController));
planosRoutes.delete("/:id", requireSuperAdmin, asyncHandler(removerController));
