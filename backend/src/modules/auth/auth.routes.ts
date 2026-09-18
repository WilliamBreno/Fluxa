import { Router } from "express";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { rateLimit } from "../../middlewares/rateLimiter";
import { requireAuth } from "../../middlewares/auth.middleware";
import { loginSchema } from "./auth.schemas";
import { loginController, logoutController, meController, refreshController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post(
  "/login",
  rateLimit({ janelaMs: 60_000, maxTentativas: 8 }),
  validateBody(loginSchema),
  asyncHandler(loginController)
);
authRoutes.post("/refresh", asyncHandler(refreshController));
authRoutes.post("/logout", asyncHandler(logoutController));
authRoutes.get("/me", requireAuth, asyncHandler(meController));
