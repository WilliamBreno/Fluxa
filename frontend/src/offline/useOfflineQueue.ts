import { api } from "@/api/client";
import type { Movimentacao } from "@/api/movimentacoes.api";
import * as queue from "./queue";
import * as sync from "./sync";
import type { PayloadMovimentacao } from "./types";

interface ResultadoEnvio {
  offline: boolean;
  movimentacao?: Movimentacao;
}

/**
 * Ponto único de entrada para lançar uma movimentação: tenta enviar direto
 * se parecer online; se a rede falhar de verdade (não um erro de validação
 * do servidor), cai para a fila local e devolve `offline: true` em vez de
 * lançar — a tela decide como avisar o operador.
 */
export function useOfflineQueue() {
  async function enviarMovimentacao(turnoId: string, payload: PayloadMovimentacao): Promise<ResultadoEnvio> {
    const chaveIdempotencia = crypto.randomUUID();

    if (navigator.onLine) {
      try {
        const { data } = await api.post<Movimentacao>(`/turnos/${turnoId}/movimentacoes`, {
          ...payload,
          chaveIdempotencia,
        });
        return { offline: false, movimentacao: data };
      } catch (err) {
        const temResposta = !!(err as { response?: unknown })?.response;
        if (temResposta) {
          // Erro real do servidor (validação, permissão, turno fechado etc.)
          // — propaga pra tela mostrar a mensagem certa, não é caso de fila.
          throw err;
        }
      }
    }

    // Offline (ou a tentativa acima falhou por rede de verdade): enfileira.
    await queue.enfileirarOperacao({ id: chaveIdempotencia, turnoId, payload });
    sync.processarFila();
    return { offline: true };
  }

  return { enviarMovimentacao };
}
