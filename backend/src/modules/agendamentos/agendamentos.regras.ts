import type { StatusAgendamento } from "@prisma/client";

/**
 * Máquina de estados do agendamento. Estados finais (CONCLUIDO, CANCELADO,
 * FALTOU) não saem mais de si — corrigir um engano vira um novo agendamento,
 * do mesmo jeito que estorno em caixa nunca apaga a venda original.
 */
export const TRANSICOES_STATUS: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGENDADO: ["CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTOU"],
  CONFIRMADO: ["AGENDADO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTOU"],
  EM_ATENDIMENTO: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
  FALTOU: [],
};

/** Status em que o horário continua reservado (entra na checagem de conflito). */
export const STATUS_OCUPAM_HORARIO: StatusAgendamento[] = ["AGENDADO", "CONFIRMADO", "EM_ATENDIMENTO", "CONCLUIDO"];

/** Só dá para mexer em data/serviço/profissional antes do atendimento começar. */
export const STATUS_EDITAVEIS: StatusAgendamento[] = ["AGENDADO", "CONFIRMADO"];

export function podeTransicionar(de: StatusAgendamento, para: StatusAgendamento): boolean {
  return TRANSICOES_STATUS[de].includes(para);
}

/** Intervalos semiabertos [inicio, fim): um atendimento que termina às 10h não conflita com outro que começa às 10h. */
export function intervalosSobrepoem(
  a: { inicio: Date; fim: Date },
  b: { inicio: Date; fim: Date }
): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export const DURACAO_MAXIMA_MINUTOS = 12 * 60;
