import { Prisma, FormaPagamento } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";

export const TODAS_FORMAS_PAGAMENTO: FormaPagamento[] = [
  "DINHEIRO",
  "DEBITO",
  "CREDITO",
  "PIX",
  "VALE",
  "FIADO",
  "OUTRO",
];

export interface ResumoSaldoTurno {
  saldoPorForma: Record<FormaPagamento, Prisma.Decimal>;
  totalVendasPorForma: Record<FormaPagamento, Prisma.Decimal>;
  totalVendas: Prisma.Decimal;
  totalSangrias: Prisma.Decimal;
  totalSuprimentos: Prisma.Decimal;
  quantidadeCupons: number;
  ticketMedio: Prisma.Decimal;
}

function zerarPorForma(): Record<FormaPagamento, Prisma.Decimal> {
  return Object.fromEntries(
    TODAS_FORMAS_PAGAMENTO.map((f) => [f, new Prisma.Decimal(0)])
  ) as Record<FormaPagamento, Prisma.Decimal>;
}

/**
 * Calcula o saldo esperado em caixa por forma de pagamento a partir das
 * movimentações ATIVAS do turno. Usado tanto pela Leitura X (sem travar nada)
 * quanto pelo cálculo de divergência do fechamento (Redução Z) — é a mesma
 * regra de negócio, então vive num único lugar.
 *
 * Só movimentações com status ATIVA entram na conta: PENDENTE_CONFERENCIA
 * (sangria/suprimento de valor alto ainda não confirmado por segunda pessoa)
 * fica de fora até ser conferida, e ESTORNADA nunca conta.
 */
export async function calcularResumoSaldoTurno(
  turnoId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ResumoSaldoTurno> {
  const turno = await client.turnoCaixa.findUnique({ where: { id: turnoId } });
  if (!turno) throw new AppError("Turno não encontrado.", 404);

  const movimentacoes = await client.movimentacaoCaixa.findMany({
    where: { turnoId, status: "ATIVA" },
  });

  const saldoPorForma = zerarPorForma();
  const totalVendasPorForma = zerarPorForma();
  saldoPorForma.DINHEIRO = saldoPorForma.DINHEIRO.plus(turno.fundoTrocoInformado);

  let totalSangrias = new Prisma.Decimal(0);
  let totalSuprimentos = new Prisma.Decimal(0);
  let quantidadeCupons = 0;

  for (const mov of movimentacoes) {
    const forma = mov.formaPagamento ?? "DINHEIRO";
    switch (mov.tipo) {
      case "VENDA":
        saldoPorForma[forma] = saldoPorForma[forma].plus(mov.valor);
        totalVendasPorForma[forma] = totalVendasPorForma[forma].plus(mov.valor);
        quantidadeCupons += 1;
        break;
      case "SUPRIMENTO":
        saldoPorForma.DINHEIRO = saldoPorForma.DINHEIRO.plus(mov.valor);
        totalSuprimentos = totalSuprimentos.plus(mov.valor);
        break;
      case "SANGRIA":
        saldoPorForma.DINHEIRO = saldoPorForma.DINHEIRO.minus(mov.valor);
        totalSangrias = totalSangrias.plus(mov.valor);
        break;
      case "CANCELAMENTO":
      case "DEVOLUCAO":
        saldoPorForma[forma] = saldoPorForma[forma].minus(mov.valor);
        totalVendasPorForma[forma] = totalVendasPorForma[forma].minus(mov.valor);
        break;
      case "AJUSTE":
        // valor já armazenado com o sinal correto (positivo = sobra, negativo = falta)
        saldoPorForma[forma] = saldoPorForma[forma].plus(mov.valor);
        break;
    }
  }

  const totalVendas = Object.values(totalVendasPorForma).reduce(
    (acc, v) => acc.plus(v),
    new Prisma.Decimal(0)
  );
  const ticketMedio = quantidadeCupons > 0 ? totalVendas.div(quantidadeCupons) : new Prisma.Decimal(0);

  return {
    saldoPorForma,
    totalVendasPorForma,
    totalVendas,
    totalSangrias,
    totalSuprimentos,
    quantidadeCupons,
    ticketMedio,
  };
}
