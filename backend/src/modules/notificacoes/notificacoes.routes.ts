import { Router } from "express";
import { requireAuth, requireLoja } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  listarController,
  marcarComoLidaController,
  marcarTodasComoLidasController,
} from "./notificacoes.controller";

export const notificacoesRoutes = Router();

// Sem requireAssinaturaAtiva de propósito: é aqui que aparece o aviso de
// "sua assinatura venceu" — precisa ser visível mesmo com o acesso bloqueado.
notificacoesRoutes.use(requireAuth, requireLoja);

notificacoesRoutes.get("/", asyncHandler(listarController));
notificacoesRoutes.patch("/:id/lida", asyncHandler(marcarComoLidaController));
notificacoesRoutes.post("/marcar-todas-lidas", asyncHandler(marcarTodasComoLidasController));
