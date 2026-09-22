import { logger } from "../lib/logger";
import { registrarJobFechamentoAutomatico } from "./fechamentoAutomatico.job";
import { registrarJobResumoDiario } from "./resumoDiario.job";
import { registrarJobNotificacoes } from "./notificacoes.job";

export function iniciarJobsAgendados() {
  registrarJobFechamentoAutomatico();
  registrarJobResumoDiario();
  registrarJobNotificacoes();
  logger.info(
    "Jobs agendados iniciados: fechamentoAutomatico (a cada minuto), resumoDiario (23:55), notificacoes (a cada 10min)"
  );
}
