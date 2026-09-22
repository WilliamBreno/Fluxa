import { randomUUID } from "crypto";
import { env } from "../../../config/env";
import { logger } from "../../../lib/logger";
import type {
  CriarCheckoutInput,
  CriarCheckoutResultado,
  PagamentoAdapter,
  WebhookVerificado,
} from "./pagamento.adapter.interface";

/**
 * Stub: não fala com nenhum provedor real. Devolve uma URL local
 * (`/assinatura/simular`) onde o próprio usuário aprova o pagamento na tela,
 * o que dispara a mesma rota de webhook que o provedor real chamaria —
 * dá pra testar o fluxo de assinatura de ponta a ponta sem credencial nenhuma.
 */
export class PagamentoAdapterStub implements PagamentoAdapter {
  async criarCheckout(input: CriarCheckoutInput): Promise<CriarCheckoutResultado> {
    const checkoutId = `SIMULADO-${randomUUID()}`;
    logger.info("[pagamento-stub] checkout simulado criado (nenhum provedor real conectado)", {
      checkoutId,
      referencia: input.referencia,
      valor: input.valor,
    });
    return {
      checkoutId,
      checkoutUrl: `${env.appPublicUrl}/assinatura/simular?checkoutId=${checkoutId}`,
    };
  }

  async verificarWebhook(payload: unknown): Promise<WebhookVerificado> {
    const corpo = payload as { checkoutId?: string; status?: "CONFIRMADO" | "FALHOU" };
    if (!corpo?.checkoutId || !corpo?.status) return { valido: false };
    return { valido: true, checkoutId: corpo.checkoutId, status: corpo.status };
  }
}
