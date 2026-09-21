import { Prisma, type FormaPagamento, type TipoMovimentacao } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TODAS_FORMAS_PAGAMENTO } from "../turnos/saldoCaixa.util";

export async function buscarFechamento(turnoId: string) {
  const relatorio = await prisma.relatorioFechamento.findUnique({ where: { turnoId } });
  if (!relatorio) {
    throw new AppError("Este turno ainda não foi fechado ou o relatório não foi gerado.", 404);
  }
  return relatorio;
}

interface ComparativoFiltros {
  lojaId: string;
  dataInicio?: Date;
  dataFim?: Date;
  agruparPor: "operador" | "terminal" | "dia";
}

export async function comparativo(filtros: ComparativoFiltros) {
  const turnos = await prisma.turnoCaixa.findMany({
    where: {
      lojaId: filtros.lojaId,
      status: "FECHADO",
      dataFechamento: {
        gte: filtros.dataInicio,
        lte: filtros.dataFim,
      },
    },
    include: {
      terminal: { select: { nome: true } },
      operadorFechamento: { select: { id: true, nome: true } },
      fechamento: { select: { divergenciaTotal: true, classificacaoGeral: true } },
    },
  });

  const grupos = new Map<
    string,
    { chave: string; quantidadeTurnos: number; divergenciaTotal: Prisma.Decimal; comDivergencia: number }
  >();

  for (const turno of turnos) {
    let chave: string;
    if (filtros.agruparPor === "operador") {
      chave = turno.operadorFechamento?.nome ?? "Desconhecido";
    } else if (filtros.agruparPor === "terminal") {
      chave = turno.terminal.nome;
    } else {
      chave = (turno.dataFechamento ?? turno.dataAbertura).toISOString().slice(0, 10);
    }

    const divergencia = turno.fechamento?.divergenciaTotal ?? new Prisma.Decimal(0);
    const atual = grupos.get(chave) ?? {
      chave,
      quantidadeTurnos: 0,
      divergenciaTotal: new Prisma.Decimal(0),
      comDivergencia: 0,
    };
    atual.quantidadeTurnos += 1;
    atual.divergenciaTotal = atual.divergenciaTotal.plus(divergencia);
    if (turno.fechamento?.classificacaoGeral && turno.fechamento.classificacaoGeral !== "EXATO") {
      atual.comDivergencia += 1;
    }
    grupos.set(chave, atual);
  }

  return Array.from(grupos.values())
    .map((g) => ({
      chave: g.chave,
      quantidadeTurnos: g.quantidadeTurnos,
      divergenciaTotal: g.divergenciaTotal.toFixed(2),
      comDivergencia: g.comDivergencia,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

/** Previsão simples: média do saldo líquido diário dos últimos 30 dias, projetada para os próximos 7. */
export async function previsaoCaixa(lojaId: string) {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const movimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: { status: "ATIVA", turno: { lojaId }, createdAt: { gte: desde } },
    select: { tipo: true, valor: true, createdAt: true },
  });

  const porDia = new Map<string, Prisma.Decimal>();
  for (const mov of movimentacoes) {
    const dia = mov.createdAt.toISOString().slice(0, 10);
    const sinal = mov.tipo === "VENDA" || mov.tipo === "SUPRIMENTO" ? 1 : mov.tipo === "AJUSTE" ? 1 : -1;
    const atual = porDia.get(dia) ?? new Prisma.Decimal(0);
    porDia.set(dia, atual.plus(mov.valor.times(sinal)));
  }

  const dias = Array.from(porDia.values());
  const mediaDiaria =
    dias.length > 0
      ? dias.reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0)).div(dias.length)
      : new Prisma.Decimal(0);

  const projecao = Array.from({ length: 7 }).map((_, i) => {
    const data = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
    return { data: data.toISOString().slice(0, 10), saldoProjetado: mediaDiaria.toFixed(2) };
  });

  return { mediaDiariaHistorica: mediaDiaria.toFixed(2), baseDias: dias.length, projecao };
}

interface ExportacaoContabilInput {
  lojaId: string;
  dataInicio: Date;
  dataFim: Date;
}

export async function exportacaoContabil(input: ExportacaoContabilInput) {
  const movimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: {
      status: "ATIVA",
      turno: { lojaId: input.lojaId },
      createdAt: { gte: input.dataInicio, lte: input.dataFim },
    },
    select: { tipo: true, valor: true, formaPagamento: true, createdAt: true },
  });

  const formas = ["DINHEIRO", "DEBITO", "CREDITO", "PIX", "VALE", "FIADO", "OUTRO"] as const;
  const porDia = new Map<
    string,
    { totalVendas: Prisma.Decimal; totalSangrias: Prisma.Decimal; totalSuprimentos: Prisma.Decimal; porForma: Record<string, Prisma.Decimal> }
  >();

  for (const mov of movimentacoes) {
    const dia = mov.createdAt.toISOString().slice(0, 10);
    const atual = porDia.get(dia) ?? {
      totalVendas: new Prisma.Decimal(0),
      totalSangrias: new Prisma.Decimal(0),
      totalSuprimentos: new Prisma.Decimal(0),
      porForma: Object.fromEntries(formas.map((f) => [f, new Prisma.Decimal(0)])),
    };

    if (mov.tipo === "VENDA") {
      atual.totalVendas = atual.totalVendas.plus(mov.valor);
      const forma = mov.formaPagamento ?? "OUTRO";
      atual.porForma[forma] = atual.porForma[forma].plus(mov.valor);
    } else if (mov.tipo === "SANGRIA") {
      atual.totalSangrias = atual.totalSangrias.plus(mov.valor);
    } else if (mov.tipo === "SUPRIMENTO") {
      atual.totalSuprimentos = atual.totalSuprimentos.plus(mov.valor);
    }

    porDia.set(dia, atual);
  }

  return Array.from(porDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, valores]) => ({
      data,
      totalVendas: valores.totalVendas.toFixed(2),
      totalSangrias: valores.totalSangrias.toFixed(2),
      totalSuprimentos: valores.totalSuprimentos.toFixed(2),
      totalPorForma: Object.fromEntries(
        Object.entries(valores.porForma).map(([f, v]) => [f, v.toFixed(2)])
      ),
    }));
}

/** Alertas de padrão suspeito: mesmo operador com divergência recorrente acima da tolerância. */
export async function alertasDivergenciaRecorrente(lojaId: string, minimoOcorrencias = 3) {
  const desde = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const turnos = await prisma.turnoCaixa.findMany({
    where: { lojaId, status: "FECHADO", dataFechamento: { gte: desde } },
    include: {
      operadorFechamento: { select: { id: true, nome: true } },
      fechamento: { select: { classificacaoGeral: true, divergenciaTotal: true } },
    },
  });

  const porOperador = new Map<string, { nome: string; ocorrencias: number; divergenciaAcumulada: Prisma.Decimal }>();
  for (const turno of turnos) {
    if (!turno.operadorFechamento || !turno.fechamento) continue;
    if (turno.fechamento.classificacaoGeral === "EXATO") continue;

    const atual = porOperador.get(turno.operadorFechamento.id) ?? {
      nome: turno.operadorFechamento.nome,
      ocorrencias: 0,
      divergenciaAcumulada: new Prisma.Decimal(0),
    };
    atual.ocorrencias += 1;
    atual.divergenciaAcumulada = atual.divergenciaAcumulada.plus(
      turno.fechamento.divergenciaTotal ?? new Prisma.Decimal(0)
    );
    porOperador.set(turno.operadorFechamento.id, atual);
  }

  return Array.from(porOperador.entries())
    .filter(([, dados]) => dados.ocorrencias >= minimoOcorrencias)
    .map(([operadorId, dados]) => ({
      operadorId,
      operadorNome: dados.nome,
      ocorrencias: dados.ocorrencias,
      divergenciaAcumulada: dados.divergenciaAcumulada.toFixed(2),
    }));
}

interface DivergenciaPorOperadorFiltros {
  lojaId: string;
  dataInicio?: Date;
  dataFim?: Date;
}

/** Relatório completo (não só alerta): média, máximo e tendência de divergência por operador. */
export async function divergenciaPorOperador(filtros: DivergenciaPorOperadorFiltros) {
  const turnos = await prisma.turnoCaixa.findMany({
    where: {
      lojaId: filtros.lojaId,
      status: "FECHADO",
      dataFechamento: { gte: filtros.dataInicio, lte: filtros.dataFim },
    },
    include: {
      operadorFechamento: { select: { id: true, nome: true } },
      fechamento: { select: { classificacaoGeral: true, divergenciaTotal: true } },
    },
    orderBy: { dataFechamento: "asc" },
  });

  const porOperador = new Map<
    string,
    { nome: string; registros: { divergencia: Prisma.Decimal; classificacao: string | null }[] }
  >();

  for (const turno of turnos) {
    if (!turno.operadorFechamento || !turno.fechamento) continue;
    const atual = porOperador.get(turno.operadorFechamento.id) ?? {
      nome: turno.operadorFechamento.nome,
      registros: [],
    };
    atual.registros.push({
      divergencia: turno.fechamento.divergenciaTotal ?? new Prisma.Decimal(0),
      classificacao: turno.fechamento.classificacaoGeral,
    });
    porOperador.set(turno.operadorFechamento.id, atual);
  }

  function mediaAbsoluta(registros: { divergencia: Prisma.Decimal }[]): Prisma.Decimal {
    if (registros.length === 0) return new Prisma.Decimal(0);
    const soma = registros.reduce((acc, r) => acc.plus(r.divergencia.abs()), new Prisma.Decimal(0));
    return soma.div(registros.length);
  }

  return Array.from(porOperador.entries())
    .map(([operadorId, dados]) => {
      const absolutos = dados.registros.map((r) => r.divergencia.abs());
      const maxima = absolutos.reduce((max, v) => (v.greaterThan(max) ? v : max), new Prisma.Decimal(0));

      // Tendência: compara a média de divergência da primeira metade cronológica
      // dos turnos com a segunda metade — só opina com pelo menos 4 turnos.
      const meio = Math.floor(dados.registros.length / 2);
      const mediaPrimeira = mediaAbsoluta(dados.registros.slice(0, meio));
      const mediaSegunda = mediaAbsoluta(dados.registros.slice(meio));
      let tendencia: "MELHORANDO" | "PIORANDO" | "ESTAVEL" = "ESTAVEL";
      if (dados.registros.length >= 4) {
        if (mediaSegunda.lessThan(mediaPrimeira.times(0.8))) tendencia = "MELHORANDO";
        else if (mediaSegunda.greaterThan(mediaPrimeira.times(1.2))) tendencia = "PIORANDO";
      }

      return {
        operadorId,
        operadorNome: dados.nome,
        quantidadeTurnos: dados.registros.length,
        divergenciaMedia: mediaAbsoluta(dados.registros).toFixed(2),
        divergenciaMaxima: maxima.toFixed(2),
        turnosComFalta: dados.registros.filter((r) => r.classificacao === "FALTA").length,
        turnosComSobra: dados.registros.filter((r) => r.classificacao === "SOBRA").length,
        tendencia,
      };
    })
    .sort((a, b) => Number(b.divergenciaMedia) - Number(a.divergenciaMedia));
}

interface VendasPorFormaPeriodoFiltros {
  lojaId: string;
  dataInicio: Date;
  dataFim: Date;
  agrupamento: "hora" | "dia";
  terminalId?: string;
}

function chaveHora(data: Date): string {
  return `${data.toISOString().slice(0, 13)}:00`;
}

function chaveDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Vendas por forma de pagamento, agrupadas por hora ou por dia. */
export async function vendasPorFormaPeriodo(filtros: VendasPorFormaPeriodoFiltros) {
  const vendas = await prisma.movimentacaoCaixa.findMany({
    where: {
      tipo: "VENDA",
      status: "ATIVA",
      turno: { lojaId: filtros.lojaId, terminalId: filtros.terminalId },
      createdAt: { gte: filtros.dataInicio, lte: filtros.dataFim },
    },
    select: { valor: true, formaPagamento: true, createdAt: true },
  });

  const grupos = new Map<
    string,
    { chave: string; porForma: Record<FormaPagamento, Prisma.Decimal>; total: Prisma.Decimal; quantidade: number }
  >();

  for (const venda of vendas) {
    const chave = filtros.agrupamento === "hora" ? chaveHora(venda.createdAt) : chaveDia(venda.createdAt);
    const atual = grupos.get(chave) ?? {
      chave,
      porForma: Object.fromEntries(TODAS_FORMAS_PAGAMENTO.map((f) => [f, new Prisma.Decimal(0)])) as Record<
        FormaPagamento,
        Prisma.Decimal
      >,
      total: new Prisma.Decimal(0),
      quantidade: 0,
    };
    const forma = venda.formaPagamento ?? "OUTRO";
    atual.porForma[forma] = atual.porForma[forma].plus(venda.valor);
    atual.total = atual.total.plus(venda.valor);
    atual.quantidade += 1;
    grupos.set(chave, atual);
  }

  return Array.from(grupos.values())
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .map((g) => ({
      periodo: g.chave,
      total: g.total.toFixed(2),
      quantidade: g.quantidade,
      porForma: Object.fromEntries(Object.entries(g.porForma).map(([f, v]) => [f, v.toFixed(2)])),
    }));
}

interface MovimentacoesFiltradasInput {
  lojaId: string;
  dataInicio?: Date;
  dataFim?: Date;
  terminalId?: string;
  operadorId?: string;
  formaPagamento?: FormaPagamento;
  tipo?: TipoMovimentacao;
}

/** Movimentações (sangria/suprimento etc.) filtráveis por período/caixa/operador/forma, sem depender de 1 turno. */
export async function movimentacoesFiltradas(filtros: MovimentacoesFiltradasInput) {
  return prisma.movimentacaoCaixa.findMany({
    where: {
      turno: { lojaId: filtros.lojaId, terminalId: filtros.terminalId },
      operadorId: filtros.operadorId,
      formaPagamento: filtros.formaPagamento,
      tipo: filtros.tipo,
      createdAt: { gte: filtros.dataInicio, lte: filtros.dataFim },
    },
    include: {
      operador: { select: { id: true, nome: true } },
      autorizadoPor: { select: { id: true, nome: true } },
      turno: { select: { numeroSequencial: true, terminal: { select: { nome: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

interface EstornosFiltros {
  lojaId: string;
  dataInicio?: Date;
  dataFim?: Date;
  terminalId?: string;
}

/** Cancelamentos/devoluções: quem, quando, motivo, valor — sempre vinculados à venda original. */
export async function estornos(filtros: EstornosFiltros) {
  return prisma.movimentacaoCaixa.findMany({
    where: {
      tipo: { in: ["CANCELAMENTO", "DEVOLUCAO"] },
      turno: { lojaId: filtros.lojaId, terminalId: filtros.terminalId },
      createdAt: { gte: filtros.dataInicio, lte: filtros.dataFim },
    },
    include: {
      operador: { select: { id: true, nome: true } },
      vendaReferencia: { select: { id: true, valor: true, formaPagamento: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
