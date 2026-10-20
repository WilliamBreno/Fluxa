import { Router } from "express";
import { requireAssinaturaAtiva, requireAuth, requireLoja } from "../../middlewares/auth.middleware";
import { validateBody, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/errorHandler";
import {
  alterarStatusSchema,
  atualizarAgendamentoSchema,
  criarAgendamentoSchema,
  listarAgendamentosQuerySchema,
} from "./agendamentos.schemas";
import {
  alterarStatusAgendamentoController,
  atualizarAgendamentoController,
  criarAgendamentoController,
  listarAgendamentosController,
  listarProfissionaisController,
  obterAgendamentoController,
  resumoAgendamentosController,
} from "./agendamentos.controller";

// Agenda é de uso interno de toda a equipe: qualquer funcionário da loja
// (OPERADOR+) marca, reagenda e muda status. Cada ação fica na auditoria com
// quem fez, então não há exclusão — cancelar é o caminho, com motivo.
export const agendamentosRoutes = Router();
agendamentosRoutes.use(requireAuth, requireLoja, requireAssinaturaAtiva);

agendamentosRoutes.get("/", validateQuery(listarAgendamentosQuerySchema), asyncHandler(listarAgendamentosController));
agendamentosRoutes.get("/resumo", validateQuery(listarAgendamentosQuerySchema), asyncHandler(resumoAgendamentosController));
agendamentosRoutes.get("/profissionais", asyncHandler(listarProfissionaisController));
agendamentosRoutes.post("/", validateBody(criarAgendamentoSchema), asyncHandler(criarAgendamentoController));
agendamentosRoutes.get("/:id", asyncHandler(obterAgendamentoController));
agendamentosRoutes.patch("/:id", validateBody(atualizarAgendamentoSchema), asyncHandler(atualizarAgendamentoController));
agendamentosRoutes.post("/:id/status", validateBody(alterarStatusSchema), asyncHandler(alterarStatusAgendamentoController));
