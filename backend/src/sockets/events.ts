export const SOCKET_EVENTS = {
  TURNO_ABERTO: "turno:aberto",
  TURNO_FECHADO: "turno:fechado",
  MOVIMENTACAO_CRIADA: "movimentacao:criada",
  ALERTA_TETO_GAVETA: "alerta:tetoGaveta",
  ALERTA_FECHAMENTO_NAO_REALIZADO: "alerta:fechamentoNaoRealizado",
  ALERTA_DIVERGENCIA_RECORRENTE: "alerta:divergenciaRecorrente",
} as const;

export function nomeSalaLoja(lojaId: string): string {
  return `loja:${lojaId}`;
}
