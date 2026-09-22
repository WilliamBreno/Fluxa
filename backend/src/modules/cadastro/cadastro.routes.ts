import { Router } from "express";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { rateLimit } from "../../middlewares/rateLimiter";
import { cadastroSchema } from "./cadastro.schemas";
import { cadastrarController } from "./cadastro.controller";

export const cadastroRoutes = Router();

cadastroRoutes.post(
  "/",
  rateLimit({ janelaMs: 60_000, maxTentativas: 5 }),
  validateBody(cadastroSchema),
  asyncHandler(cadastrarController)
);
