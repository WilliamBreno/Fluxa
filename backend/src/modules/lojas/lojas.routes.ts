import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import { criarLojaSchema } from "./lojas.schemas";
import { criarLojaController, listarMinhasLojasController } from "./lojas.controller";

export const lojasRoutes = Router();
lojasRoutes.use(requireAuth);

lojasRoutes.get("/", asyncHandler(listarMinhasLojasController));
lojasRoutes.post("/", requireRole("ADMIN"), validateBody(criarLojaSchema), asyncHandler(criarLojaController));
