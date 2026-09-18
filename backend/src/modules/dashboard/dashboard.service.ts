import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { calcularResumoSaldoTurno } from "../turnos/saldoCaixa.util";

function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function somaPorTipo(
  movimentacoes: { tipo: string; valor: Prisma.Decimal }[],
  tipos: string[]
): Prisma.Decimal {
  return movimentacoes
    .filter((m) => tipos.includes(m.tipo))
    .reduce((acc, m) => acc.plus(m.valor), new Prisma.Decimal(0));
}

export async function kpis(lojaId: string) {
  const hoje = inicioDoDia(new Date());
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const catorzeDiasAtras = new Date(hoje.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [movHoje, movUltimos7, movAnteriores7, turnosAbertos] = await Promise.all([
    prisma.movimentacaoCaixa.findMany({
      where: { status: "ATIVA", turno: { lojaId }, createdAt: { gte: hoje } },
      select: { tipo: true, valor: true },
    }),
    prisma.movimentacaoCaixa.findMany({
      where: { status: "ATIVA", turno: { lojaId }, createdAt: { gte: seteDiasAtras } },
      select: { tipo: true, valor: true, formaPagamento: true, createdAt: true },
    }),
    prisma.movimentacaoCaixa.findMany({
      where: {
        status: "ATIVA",
        turno: { lojaId },
        createdAt: { gte: catorzeDiasAtras, lt: seteDiasAtras },
      },
      select: { tipo: true, valor: true },
    }),
    prisma.turnoCaixa.findMany({
      where: { lojaId, status: "ABERTO" },
      select: { id: true },
    }),
  ]);

  const entradasHoje = somaPorTipo(movHoje, ["VENDA"]);
  const saidasHoje = somaPorTipo(movHoje, ["SANGRIA", "CANCELAMENTO", "DEVOLUCAO"]);

  // "A receber": vendas fiado/crediário dos últimos 7 dias ainda não quitadas
  // (nesta v1 não há baixa de recebível separada — é o total vendido a fiado).
  const fiadoAberto = movUltimos7
    .filter((m) => m.tipo === "VENDA" && m.formaPagamento === "FIADO")
    .reduce((acc, m) => acc.plus(m.valor), new Prisma.Decimal(0));

  const entradas7d = somaPorTipo(movUltimos7, ["VENDA"]);
  const entradasAnteriores7d = somaPorTipo(movAnteriores7, ["VENDA"]);
  const saidas7d = somaPorTipo(movUltimos7, ["SANGRIA", "CANCELAMENTO", "DEVOLUCAO"]);
  const saidasAnteriores7d = somaPorTipo(movAnteriores7, ["SANGRIA", "CANCELAMENTO", "DEVOLUCAO"]);

  function deltaPercentual(atual: Prisma.Decimal, anterior: Prisma.Decimal): number {
    if (anterior.isZero()) return atual.isZero() ? 0 : 100;
    return atual.minus(anterior).div(anterior).times(100).toDecimalPlaces(1).toNumber();
  }

  let saldoDinheiroAgora = new Prisma.Decimal(0);
  for (const turno of turnosAbertos) {
    const resumo = await calcularResumoSaldoTurno(turno.id);
    saldoDinheiroAgora = saldoDinheiroAgora.plus(resumo.saldoPorForma.DINHEIRO);
  }

  return {
    entradas: { valor: entradasHoje.toFixed(2), delta: deltaPercentual(entradas7d, entradasAnteriores7d) },
    saidas: { valor: saidasHoje.toFixed(2), delta: deltaPercentual(saidas7d, saidasAnteriores7d) },
    fiadoEmAberto: { valor: fiadoAberto.toFixed(2) },
    saldoProjetado: { valor: saldoDinheiroAgora.toFixed(2), turnosAbertos: turnosAbertos.length },
    referencia: { hoje: hoje.toISOString(), ontem: ontem.toISOString() },
  };
}

export async function fluxoCaixa(lojaId: string, meses = 11) {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - (meses - 1), 1);

  const movimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: { status: "ATIVA", turno: { lojaId }, createdAt: { gte: inicio } },
    select: { tipo: true, valor: true, createdAt: true },
  });

  const labels: string[] = [];
  const entradasSerie: number[] = [];
  const saidasSerie: number[] = [];
  const nomesMes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (let i = 0; i < meses; i++) {
    const referencia = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    const proximo = new Date(inicio.getFullYear(), inicio.getMonth() + i + 1, 1);
    labels.push(nomesMes[referencia.getMonth()]);

    const doMes = movimentacoes.filter((m) => m.createdAt >= referencia && m.createdAt < proximo);
    entradasSerie.push(somaPorTipo(doMes, ["VENDA"]).toNumber());
    saidasSerie.push(somaPorTipo(doMes, ["SANGRIA", "CANCELAMENTO", "DEVOLUCAO"]).toNumber());
  }

  return {
    labels,
    series: [
      { label: "Entradas", cor: "var(--fx-chart-1)", dados: entradasSerie },
      { label: "Saídas", cor: "var(--fx-chart-2)", dados: saidasSerie },
    ],
  };
}

export async function ultimosLancamentos(lojaId: string, limite = 6) {
  const movimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: { turno: { lojaId }, status: { in: ["ATIVA", "PENDENTE_CONFERENCIA"] } },
    include: { operador: { select: { nome: true } }, turno: { select: { terminal: { select: { nome: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limite,
  });

  const direcaoPorTipo: Record<string, "in" | "out"> = {
    VENDA: "in",
    SUPRIMENTO: "in",
    AJUSTE: "in",
    SANGRIA: "out",
    CANCELAMENTO: "out",
    DEVOLUCAO: "out",
  };

  return movimentacoes.map((m) => ({
    id: m.id,
    titulo: m.tipo === "VENDA" ? `Venda · ${m.turno.terminal.nome}` : m.tipo,
    meta: `${m.operador.nome} · ${m.formaPagamento ?? ""} · ${m.createdAt.toLocaleString("pt-BR")}`,
    valor: m.valor.toFixed(2),
    direcao: direcaoPorTipo[m.tipo] ?? "in",
  }));
}
