import type { FormaPagamento, ModalidadeCartao, MovimentacaoCaixa, Prisma } from "@prisma/client";

/** Débito só casa com modalidade DEBITO; crédito casa com qualquer modalidade de crédito (a
 * movimentação de venda não distingue à vista/parcelado hoje, só o extrato traz essa granularidade). */
export function modalidadesCompativeis(forma: FormaPagamento | null): ModalidadeCartao[] {
  if (forma === "DEBITO") return ["DEBITO"];
  if (forma === "CREDITO") return ["CREDITO_A_VISTA", "CREDITO_PARCELADO"];
  return [];
}

/**
 * Valor "assinado" da movimentação para fins de comparação com o extrato:
 * estornos (cancelamento/devolução) reduzem o total vendido em cartão, então
 * comparam contra linhas negativas do extrato (chargeback/estorno da
 * adquirente) — nunca contra uma venda positiva por engano.
 */
export function valorComparacaoMovimentacao(mov: Pick<MovimentacaoCaixa, "tipo" | "valor">): Prisma.Decimal {
  if (mov.tipo === "CANCELAMENTO" || mov.tipo === "DEVOLUCAO") {
    return mov.valor.negated();
  }
  return mov.valor;
}
