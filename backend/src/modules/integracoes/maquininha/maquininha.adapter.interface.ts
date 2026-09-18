export interface DadosPagamentoCartao {
  movimentacaoId: string;
  valor: string;
  tipo: "DEBITO" | "CREDITO";
}

export interface ResultadoPagamento {
  sucesso: boolean;
  nsu?: string;
  mensagem: string;
  simulado: boolean;
}

/**
 * Ponto de integração com maquininha de cartão para conciliação automática.
 * Em produção real exige contrato/SDK da credenciadora (Stone, Cielo, Rede etc.).
 * Trocar o binding em integracoes.factory.ts quando houver provedor real.
 */
export interface MaquininhaAdapter {
  iniciarPagamento(input: DadosPagamentoCartao): Promise<ResultadoPagamento>;
  cancelarPagamento(nsu: string): Promise<ResultadoPagamento>;
  consultarStatus(nsu: string): Promise<ResultadoPagamento>;
}
