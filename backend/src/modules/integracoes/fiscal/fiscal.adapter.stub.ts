import { randomUUID } from "crypto";
import type { DadosVendaFiscal, EmissorFiscalAdapter, ResultadoFiscal } from "./fiscal.adapter.interface";

/** Stub: simula sucesso imediato, sem chamar nenhum provedor real. */
export class FiscalAdapterStub implements EmissorFiscalAdapter {
  async emitirCupom(venda: DadosVendaFiscal): Promise<ResultadoFiscal> {
    return {
      sucesso: true,
      chaveAcesso: `SIMULADO-${randomUUID()}`,
      mensagem: `Cupom fiscal simulado para movimentação ${venda.movimentacaoId} (nenhum provedor fiscal real conectado).`,
      simulado: true,
    };
  }

  async cancelarCupom(chaveAcesso: string): Promise<ResultadoFiscal> {
    return {
      sucesso: true,
      chaveAcesso,
      mensagem: "Cancelamento fiscal simulado.",
      simulado: true,
    };
  }

  async consultarStatus(chaveAcesso: string): Promise<ResultadoFiscal> {
    return {
      sucesso: true,
      chaveAcesso,
      mensagem: "Status fiscal simulado: autorizado.",
      simulado: true,
    };
  }
}
