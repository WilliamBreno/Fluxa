export interface CriarCheckoutInput {
  referencia: string;
  descricao: string;
  /** Em reais (não em centavos) — o adapter concreto converte se o provedor exigir centavos. */
  valor: number;
  retornoUrl: string;
}

export interface CriarCheckoutResultado {
  checkoutId: string;
  checkoutUrl: string;
}

export interface WebhookVerificado {
  valido: boolean;
  /** Presente só quando válido: referência (checkoutId) e status normalizado do pagamento. */
  checkoutId?: string;
  status?: "CONFIRMADO" | "FALHOU";
}

/**
 * Ponto de integração com o provedor de pagamento (assinatura via InfinitePay).
 * Em produção real exige API key/handle de recebimento configurados via
 * variáveis de ambiente. Trocar o binding em integracoes.factory.ts quando
 * houver credenciais — enquanto isso, PagamentoAdapterStub simula o fluxo
 * inteiro (inclusive um endpoint de "aprovar" pra dar pra testar sem provedor real).
 */
export interface PagamentoAdapter {
  criarCheckout(input: CriarCheckoutInput): Promise<CriarCheckoutResultado>;
  /**
   * Assíncrono de propósito: provedores sem assinatura HMAC no webhook (como
   * a InfinitePay) só podem ser confirmados com uma segunda chamada de
   * consulta ao provedor (nunca confiar só no corpo que o webhook mandou).
   */
  verificarWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificado>;
}
