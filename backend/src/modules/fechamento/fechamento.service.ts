import { Prisma, type FormaPagamento } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { classificarDivergencia } from "../../utils/money";
import { sha256Json } from "../../utils/hash";
import { proximoNumeroSequencial } from "../../utils/contador.util";
import { emitirParaLoja } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../sockets/events";
import * as auditoriaService from "../auditoria/auditoria.service";
import { calcularResumoSaldoTurno, TODAS_FORMAS_PAGAMENTO } from "../turnos/saldoCaixa.util";

interface ContextoRequisicao {
  usuarioId: string;
  roleNaLoja?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Abre (ou retoma, se já aberto) o processo de fechamento. Não calcula nem
 * retorna nenhum valor esperado — é só o "início" do procedimento.
 */
export async function iniciar(turnoId: string, ctx: ContextoRequisicao) {
  const turno = await prisma.turnoCaixa.findUnique({ where: { id: turnoId } });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  if (turno.status !== "ABERTO") throw new AppError("Este caixa já está fechado.", 409);

  const existente = await prisma.fechamentoCaixa.findUnique({ where: { turnoId } });
  if (existente) {
    if (existente.status === "CONFIRMADO") {
      throw new AppError("O fechamento deste turno já foi confirmado.", 409);
    }
    return existente;
  }

  const fechamento = await prisma.fechamentoCaixa.create({
    data: { turnoId, status: "CONTAGEM_PENDENTE" },
  });

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "FECHAMENTO_CAIXA",
    entidade: "FechamentoCaixa",
    entidadeId: fechamento.id,
    detalhes: { etapa: "iniciado" },
  });

  return fechamento;
}

interface ContagemInput {
  formaPagamento: FormaPagamento;
  valorContado: number;
}

/**
 * O núcleo da contagem cega: grava o valor contado pelo operador ANTES de
 * calcular o valor esperado pelo sistema. A garantia de "cego" está na ordem
 * de escrita em banco (contagem persiste primeiro, imutável a partir daí) —
 * não em esconder a resposta HTTP do cliente. Uma vez registrada, a contagem
 * nunca pode ser reeditada por este endpoint: se o operador errou a contagem,
 * a correção correta é um lançamento de AJUSTE após o fechamento confirmado,
 * nunca "reabrir" o número que ele já viu.
 */
export async function registrarContagem(
  turnoId: string,
  input: { contagens: ContagemInput[] },
  ctx: ContextoRequisicao
) {
  const turno = await prisma.turnoCaixa.findUnique({
    where: { id: turnoId },
    include: { loja: { include: { configuracao: true } } },
  });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  if (turno.status !== "ABERTO") throw new AppError("Este caixa já está fechado.", 409);

  const fechamento = await prisma.fechamentoCaixa.findUnique({ where: { turnoId } });
  if (!fechamento) {
    throw new AppError("Inicie o fechamento antes de registrar a contagem (POST /fechamento/iniciar).", 409);
  }
  if (fechamento.status !== "CONTAGEM_PENDENTE") {
    throw new AppError(
      "A contagem já foi registrada e travada para este fechamento — não é permitido reeditá-la.",
      409
    );
  }

  const mapaContagem = new Map(input.contagens.map((c) => [c.formaPagamento, c.valorContado]));
  const tolerancia = turno.loja.configuracao?.toleranciaDivergencia ?? new Prisma.Decimal(5);

  const resultado = await prisma.$transaction(async (tx) => {
    // 1) Grava a contagem física informada PRIMEIRO, sem nenhum valor esperado ainda.
    await tx.fechamentoContagemForma.createMany({
      data: TODAS_FORMAS_PAGAMENTO.map((forma) => ({
        fechamentoId: fechamento.id,
        formaPagamento: forma,
        valorContado: mapaContagem.get(forma) ?? 0,
      })),
    });
    await tx.fechamentoCaixa.update({
      where: { id: fechamento.id },
      data: { status: "CONTAGEM_REALIZADA" },
    });

    // 2) Só agora, com a contagem já persistida e imutável, calcula o esperado.
    const resumo = await calcularResumoSaldoTurno(turnoId, tx);

    let divergenciaTotal = new Prisma.Decimal(0);
    for (const forma of TODAS_FORMAS_PAGAMENTO) {
      const valorContado = new Prisma.Decimal(mapaContagem.get(forma) ?? 0);
      const valorEsperado = resumo.saldoPorForma[forma];
      const divergencia = valorContado.minus(valorEsperado);
      divergenciaTotal = divergenciaTotal.plus(divergencia);

      await tx.fechamentoContagemForma.update({
        where: { fechamentoId_formaPagamento: { fechamentoId: fechamento.id, formaPagamento: forma } },
        data: {
          valorEsperado,
          divergencia,
          classificacao: classificarDivergencia(divergencia, tolerancia),
          calculadoEm: new Date(),
        },
      });
    }

    return tx.fechamentoCaixa.update({
      where: { id: fechamento.id },
      data: {
        status: "CALCULADO",
        divergenciaTotal,
        classificacaoGeral: classificarDivergencia(divergenciaTotal, tolerancia),
      },
      include: { contagens: true },
    });
  });

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "FECHAMENTO_CAIXA",
    entidade: "FechamentoCaixa",
    entidadeId: fechamento.id,
    detalhes: { etapa: "contagem_registrada", divergenciaTotal: resultado.divergenciaTotal?.toFixed(2) },
  });

  return resultado;
}

export async function obterDivergencia(turnoId: string) {
  const fechamento = await prisma.fechamentoCaixa.findUnique({
    where: { turnoId },
    include: { contagens: true },
  });
  if (!fechamento) throw new AppError("Fechamento ainda não iniciado para este turno.", 404);
  if (fechamento.status === "CONTAGEM_PENDENTE") {
    throw new AppError("A contagem cega ainda não foi registrada.", 409);
  }
  return fechamento;
}

interface ConfirmarInput {
  causaDivergencia?: string;
  gerarAjusteAutomatico: boolean;
  observacoesFechamento?: string;
}

export async function confirmar(turnoId: string, input: ConfirmarInput, ctx: ContextoRequisicao) {
  const turno = await prisma.turnoCaixa.findUnique({
    where: { id: turnoId },
    include: { loja: { include: { configuracao: true } }, terminal: true },
  });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  if (turno.status !== "ABERTO") throw new AppError("Este caixa já está fechado.", 409);

  const fechamento = await prisma.fechamentoCaixa.findUnique({
    where: { turnoId },
    include: { contagens: true },
  });
  if (!fechamento || fechamento.status !== "CALCULADO") {
    throw new AppError("Registre a contagem cega antes de confirmar o fechamento.", 409);
  }

  const tolerancia = turno.loja.configuracao?.toleranciaDivergencia ?? new Prisma.Decimal(5);
  const divergenciaTotal = fechamento.divergenciaTotal ?? new Prisma.Decimal(0);

  if (divergenciaTotal.abs().greaterThan(tolerancia) && !input.causaDivergencia) {
    throw new AppError(
      `Divergência de ${divergenciaTotal.toFixed(2)} acima da tolerância (${tolerancia.toFixed(2)}) — informe a causa da divergência para confirmar o fechamento.`,
      400
    );
  }

  const resultado = await prisma.$transaction(async (tx) => {
    if (input.gerarAjusteAutomatico) {
      for (const contagem of fechamento.contagens) {
        if (contagem.divergencia && contagem.divergencia.abs().greaterThan(tolerancia)) {
          await tx.movimentacaoCaixa.create({
            data: {
              turnoId,
              tipo: "AJUSTE",
              formaPagamento: contagem.formaPagamento,
              valor: contagem.divergencia,
              motivo: `Ajuste automático de fechamento — ${input.causaDivergencia ?? "divergência na contagem cega"}`,
              operadorId: ctx.usuarioId,
              status: "ATIVA",
            },
          });
        }
      }
    }

    await tx.fechamentoCaixa.update({
      where: { id: fechamento.id },
      data: {
        status: "CONFIRMADO",
        causaDivergencia: input.causaDivergencia,
        ajusteAutomaticoGerado: input.gerarAjusteAutomatico,
        confirmadoPorId: ctx.usuarioId,
        confirmadoEm: new Date(),
      },
    });

    const turnoFechado = await tx.turnoCaixa.update({
      where: { id: turnoId },
      data: {
        status: "FECHADO",
        operadorFechamentoId: ctx.usuarioId,
        dataFechamento: new Date(),
        observacoesFechamento: input.observacoesFechamento,
      },
    });

    const resumoFinal = await calcularResumoSaldoTurno(turnoId, tx);
    const numeroSequencial = await proximoNumeroSequencial(tx, turno.lojaId, "relatorio");

    const conteudoJson = {
      turnoId,
      terminal: { id: turno.terminal.id, nome: turno.terminal.nome, codigo: turno.terminal.codigo },
      numeroSequencialTurno: turno.numeroSequencial,
      periodo: turno.periodo,
      dataAbertura: turno.dataAbertura,
      dataFechamento: turnoFechado.dataFechamento,
      fundoTrocoInformado: turno.fundoTrocoInformado.toFixed(2),
      totalVendasPorForma: Object.fromEntries(
        TODAS_FORMAS_PAGAMENTO.map((f) => [f, resumoFinal.totalVendasPorForma[f].toFixed(2)])
      ),
      totalVendas: resumoFinal.totalVendas.toFixed(2),
      totalSangrias: resumoFinal.totalSangrias.toFixed(2),
      totalSuprimentos: resumoFinal.totalSuprimentos.toFixed(2),
      quantidadeCupons: resumoFinal.quantidadeCupons,
      ticketMedio: resumoFinal.ticketMedio.toFixed(2),
      contagens: fechamento.contagens.map((c) => ({
        formaPagamento: c.formaPagamento,
        valorContado: c.valorContado.toFixed(2),
        valorEsperado: c.valorEsperado?.toFixed(2),
        divergencia: c.divergencia?.toFixed(2),
        classificacao: c.classificacao,
      })),
      divergenciaTotal: divergenciaTotal.toFixed(2),
      classificacaoGeral: fechamento.classificacaoGeral,
      causaDivergencia: input.causaDivergencia ?? null,
      ajusteAutomaticoGerado: input.gerarAjusteAutomatico,
      confirmadoPorId: ctx.usuarioId,
    };

    const relatorio = await tx.relatorioFechamento.create({
      data: {
        turnoId,
        lojaId: turno.lojaId,
        numeroSequencial,
        conteudoJson,
        hashIntegridade: sha256Json(conteudoJson),
      },
    });

    return { turno: turnoFechado, relatorio };
  });

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "FECHAMENTO_CAIXA",
    entidade: "TurnoCaixa",
    entidadeId: turnoId,
    detalhes: {
      etapa: "confirmado",
      divergenciaTotal: divergenciaTotal.toFixed(2),
      classificacaoGeral: fechamento.classificacaoGeral,
    },
  });

  emitirParaLoja(turno.lojaId, SOCKET_EVENTS.TURNO_FECHADO, {
    turnoId,
    relatorioId: resultado.relatorio.id,
  });

  return resultado;
}
