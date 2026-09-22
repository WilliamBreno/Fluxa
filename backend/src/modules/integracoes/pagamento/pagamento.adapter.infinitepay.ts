import { env } from "../../../config/env";
import { logger } from "../../../lib/logger";
import { AppError } from "../../../middlewares/errorHandler";
import type {
  CriarCheckoutInput,
  CriarCheckoutResultado,
  PagamentoAdapter,
  WebhookVerificado,
} from "./pagamento.adapter.interface";

const BASE_URL = "https://api.checkout.infinitepay.io";

interface RespostaLink {
  url?: string;
  checkout_url?: string;
  link?: string;
  slug?: string;
  id?: string;
}

interface PayloadWebhookInfinitepay {
  invoice_slug?: string;
  order_nsu?: string;
  transaction_nsu?: string;
  amount?: number;
  paid_amount?: number;
}

/**
 * Integração real com o Checkout Integrado da InfinitePay
 * (https://api.checkout.infinitepay.io — doc pública em
 * infinitepay.io/checkout-documentacao). Autenticação é por `handle` (a
 * InfiniteTag do recebedor), sem cabeçalho de API key. O webhook da
 * InfinitePay não usa assinatura HMAC — por isso `verificarWebhook` nunca
 * confia direto no corpo recebido: ele confirma o pagamento de volta no
 * endpoint `/payment_check` antes de considerar válido.
 */
export class PagamentoAdapterInfinitepay implements PagamentoAdapter {
  private handle(): string {
    if (!env.infinitepayHandle) {
      throw new AppError("INFINITEPAY_HANDLE não configurado no ambiente.", 500);
    }
    return env.infinitepayHandle;
  }

  async criarCheckout(input: CriarCheckoutInput): Promise<CriarCheckoutResultado> {
    const resposta = await fetch(`${BASE_URL}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: this.handle(),
        order_nsu: input.referencia,
        redirect_url: input.retornoUrl,
        webhook_url: `${env.apiPublicUrl}/api/assinatura/webhook`,
        items: [{ quantity: 1, price: Math.round(input.valor * 100), description: input.descricao }],
      }),
    });

    const corpo = (await resposta.json().catch(() => ({}))) as RespostaLink;
    if (!resposta.ok) {
      logger.error("[infinitepay] falha ao criar checkout", { status: resposta.status, corpo });
      throw new AppError("Não foi possível gerar o link de pagamento da InfinitePay agora.", 502);
    }

    const checkoutUrl = corpo.url ?? corpo.checkout_url ?? corpo.link;
    if (!checkoutUrl) {
      logger.error("[infinitepay] resposta sem URL de checkout reconhecível", { corpo });
      throw new AppError("Resposta inesperada da InfinitePay ao gerar o checkout.", 502);
    }

    return { checkoutId: input.referencia, checkoutUrl };
  }

  async verificarWebhook(payload: unknown): Promise<WebhookVerificado> {
    const corpo = payload as PayloadWebhookInfinitepay;
    if (!corpo?.order_nsu) return { valido: false };

    try {
      const resposta = await fetch(`${BASE_URL}/payment_check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: this.handle(),
          order_nsu: corpo.order_nsu,
          transaction_nsu: corpo.transaction_nsu,
          slug: corpo.invoice_slug,
        }),
      });
      const confirmacao = (await resposta.json().catch(() => ({}))) as { success?: boolean; paid?: boolean };
      if (!resposta.ok || !confirmacao.success) return { valido: false };

      return {
        valido: true,
        checkoutId: corpo.order_nsu,
        status: confirmacao.paid ? "CONFIRMADO" : "FALHOU",
      };
    } catch (err) {
      logger.error("[infinitepay] erro ao confirmar webhook via payment_check", err);
      return { valido: false };
    }
  }
}
