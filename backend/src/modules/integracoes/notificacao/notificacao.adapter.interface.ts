export interface ResumoDiarioDTO {
  lojaNome: string;
  data: string;
  totalVendas: string;
  totalSangrias: string;
  totalSuprimentos: string;
  quantidadeCupons: number;
  ticketMedio: string;
  turnosComDivergencia: number;
}

/**
 * Ponto de integração para notificações (e-mail/WhatsApp) do resumo diário
 * ao gestor. Em produção real exige SMTP/WhatsApp Business API configurados
 * pelo usuário — fora do escopo desta v1.
 */
export interface NotificacaoAdapter {
  enviarResumoDiario(destinatarios: string[], resumo: ResumoDiarioDTO): Promise<void>;
  enviarAlerta(destinatarios: string[], mensagem: string): Promise<void>;
}
