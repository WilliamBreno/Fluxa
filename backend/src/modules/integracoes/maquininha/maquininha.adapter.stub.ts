import { randomUUID } from "crypto";
import type {
  DadosPagamentoCartao,
  MaquininhaAdapter,
  ResultadoPagamento,
} from "./maquininha.adapter.interface";

export class MaquininhaAdapterStub implements MaquininhaAdapter {
  async iniciarPagamento(input: DadosPagamentoCartao): Promise<ResultadoPagamento> {
    return {
      sucesso: true,
      nsu: `SIMULADO-${randomUUID()}`,
      mensagem: `Pagamento ${input.tipo} simulado para movimentação ${input.movimentacaoId} (nenhuma maquininha real conectada).`,
      simulado: true,
    };
  }

  async cancelarPagamento(nsu: string): Promise<ResultadoPagamento> {
    return { sucesso: true, nsu, mensagem: "Cancelamento simulado.", simulado: true };
  }

  async consultarStatus(nsu: string): Promise<ResultadoPagamento> {
    return { sucesso: true, nsu, mensagem: "Status simulado: aprovado.", simulado: true };
  }
}
