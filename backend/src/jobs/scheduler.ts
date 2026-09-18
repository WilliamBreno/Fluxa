import { logger } from "../lib/logger";
import { registrarJobFechamentoAutomatico } from "./fechamentoAutomatico.job";
import { registrarJobResumoDiario } from "./resumoDiario.job";

export function iniciarJobsAgendados() {
  registrarJobFechamentoAutomatico();
  registrarJobResumoDiario();
  logger.info("Jobs agendados iniciados: fechamentoAutomatico (a cada minuto), resumoDiario (23:55)");
}
