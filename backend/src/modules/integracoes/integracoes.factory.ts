import { env } from "../../config/env";
import type { EmissorFiscalAdapter } from "./fiscal/fiscal.adapter.interface";
import { FiscalAdapterStub } from "./fiscal/fiscal.adapter.stub";
import type { MaquininhaAdapter } from "./maquininha/maquininha.adapter.interface";
import { MaquininhaAdapterStub } from "./maquininha/maquininha.adapter.stub";
import type { NotificacaoAdapter } from "./notificacao/notificacao.adapter.interface";
import { NotificacaoAdapterStub } from "./notificacao/notificacao.adapter.stub";

/**
 * Ponto único de escolha de implementação por variável de ambiente.
 * Plugar um provedor real no futuro é implementar a interface correspondente
 * e adicionar um `case` aqui — nenhum service consumidor precisa mudar.
 */
export function getFiscalAdapter(): EmissorFiscalAdapter {
  switch (env.fiscalProvider) {
    case "stub":
    default:
      return new FiscalAdapterStub();
  }
}

export function getMaquininhaAdapter(): MaquininhaAdapter {
  switch (env.maquininhaProvider) {
    case "stub":
    default:
      return new MaquininhaAdapterStub();
  }
}

export function getNotificacaoAdapter(): NotificacaoAdapter {
  switch (env.notificacaoProvider) {
    case "stub":
    default:
      return new NotificacaoAdapterStub();
  }
}
