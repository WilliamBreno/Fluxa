export interface DadosVendaFiscal {
  movimentacaoId: string;
  valor: string;
  formaPagamento: string;
  lojaId: string;
}

export interface ResultadoFiscal {
  sucesso: boolean;
  chaveAcesso?: string;
  mensagem: string;
  simulado: boolean;
}

/**
 * Ponto de integração fiscal (NFC-e). Em produção real no Brasil isso exige
 * certificado digital A1/A3 e homologação com a SEFAZ do estado — fora do
 * escopo desta v1. A implementação real deve apenas satisfazer esta interface
 * e ser conectada em integracoes.factory.ts, sem tocar em quem a consome.
 */
export interface EmissorFiscalAdapter {
  emitirCupom(venda: DadosVendaFiscal): Promise<ResultadoFiscal>;
  cancelarCupom(chaveAcesso: string, motivo: string): Promise<ResultadoFiscal>;
  consultarStatus(chaveAcesso: string): Promise<ResultadoFiscal>;
}
