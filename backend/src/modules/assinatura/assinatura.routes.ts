import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { iniciarCheckoutSchema } from "./assinatura.schemas";
import {
  iniciarCheckoutController,
  obterStatusController,
  simularController,
  webhookController,
} from "./assinatura.controller";

export const assinaturaRoutes = Router();

// Sem requireLoja/requireAssinaturaAtiva de propósito: o usuário precisa ver
// e resolver a própria assinatura mesmo com o acesso operacional bloqueado.
assinaturaRoutes.get("/", requireAuth, asyncHandler(obterStatusController));
assinaturaRoutes.post(
  "/checkout",
  requireAuth,
  validateBody(iniciarCheckoutSchema),
  asyncHandler(iniciarCheckoutController)
);
assinaturaRoutes.post("/simular", requireAuth, asyncHandler(simularController));

// Público: chamado pelo provedor de pagamento, não pelo navegador do usuário.
assinaturaRoutes.post("/webhook", asyncHandler(webhookController));
