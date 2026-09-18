import { logger } from "../../../lib/logger";
import type { NotificacaoAdapter, ResumoDiarioDTO } from "./notificacao.adapter.interface";

/** Stub: apenas registra em log, não envia e-mail/WhatsApp real nenhum. */
export class NotificacaoAdapterStub implements NotificacaoAdapter {
  async enviarResumoDiario(destinatarios: string[], resumo: ResumoDiarioDTO): Promise<void> {
    logger.info("[notificacao-stub] resumo diário simulado (não enviado de verdade)", {
      destinatarios,
      resumo,
    });
  }

  async enviarAlerta(destinatarios: string[], mensagem: string): Promise<void> {
    logger.info("[notificacao-stub] alerta simulado (não enviado de verdade)", {
      destinatarios,
      mensagem,
    });
  }
}
