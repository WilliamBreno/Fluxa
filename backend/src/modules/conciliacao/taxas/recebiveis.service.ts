import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export interface LinhaAgendaRecebiveis {
  data: string;
  valorPrevisto: string;
  quantidade: number;
}

/** Agenda de recebíveis: valor líquido esperado por data prevista de pagamento. */
export async function agendaRecebiveis(lojaId: string, dataInicio: Date, dataFim: Date): Promise<LinhaAgendaRecebiveis[]> {
  const transacoes = await prisma.transacaoExtratoCartao.findMany({
    where: { lojaId, dataPagamentoPrevista: { gte: dataInicio, lte: dataFim } },
    select: { dataPagamentoPrevista: true, valorLiquido: true },
  });

  const porDia = new Map<string, { total: Prisma.Decimal; quantidade: number }>();
  for (const t of transacoes) {
    const chave = t.dataPagamentoPrevista.toISOString().slice(0, 10);
    const atual = porDia.get(chave) ?? { total: new Prisma.Decimal(0), quantidade: 0 };
    atual.total = atual.total.plus(t.valorLiquido);
    atual.quantidade += 1;
    porDia.set(chave, atual);
  }

  return Array.from(porDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, valores]) => ({ data, valorPrevisto: valores.total.toFixed(2), quantidade: valores.quantidade }));
}
