export interface PayloadMovimentacao {
  tipo: string;
  formaPagamento?: string;
  valor: number;
  motivo?: string;
  descricao?: string;
  vendaReferenciaId?: string;
}

export interface OperacaoFila {
  /** Mesmo valor da chaveIdempotencia enviada ao servidor — chave primária da fila. */
  id: string;
  turnoId: string;
  payload: PayloadMovimentacao;
  criadaEm: number;
  tentativas: number;
  proximaTentativaEm: number;
  ultimoErro?: string;
}

export interface OperacaoRejeitada extends OperacaoFila {
  motivoRejeicao: string;
  rejeitadaEm: number;
}

export type StatusConexao = "online" | "offline";
