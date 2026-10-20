import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja, requireRole } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  atualizarClienteSchema,
  criarClienteSchema,
  criarNotaSchema,
  listarClientesQuerySchema,
} from "./clientes.schemas";
import {
  atualizarClienteController,
  buscarClientesController,
  criarClienteController,
  criarNotaController,
  exportarClientesController,
  historicoClienteController,
  listarClientesController,
  listarNotasController,
  listarTagsController,
  obterClienteController,
} from "./clientes.controller";

// Qualquer funcionário da loja (OPERADOR+) cadastra e consulta clientes — é
// quem está no balcão que faz o agendamento. Exportar a base inteira, que tem
// dados pessoais, fica restrito a GERENTE.
export const clientesRoutes = Router();
clientesRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);

clientesRoutes.get("/", validateQuery(listarClientesQuerySchema), asyncHandler(listarClientesController));
clientesRoutes.get("/busca", asyncHandler(buscarClientesController));
clientesRoutes.get("/tags", asyncHandler(listarTagsController));
clientesRoutes.get(
  "/exportar",
  requireRole("GERENTE"),
  validateQuery(listarClientesQuerySchema),
  asyncHandler(exportarClientesController)
);
clientesRoutes.post("/", validateBody(criarClienteSchema), asyncHandler(criarClienteController));
clientesRoutes.get("/:id", asyncHandler(obterClienteController));
clientesRoutes.patch("/:id", validateBody(atualizarClienteSchema), asyncHandler(atualizarClienteController));
clientesRoutes.get("/:id/agendamentos", asyncHandler(historicoClienteController));
clientesRoutes.get("/:id/notas", asyncHandler(listarNotasController));
clientesRoutes.post("/:id/notas", validateBody(criarNotaSchema), asyncHandler(criarNotaController));
