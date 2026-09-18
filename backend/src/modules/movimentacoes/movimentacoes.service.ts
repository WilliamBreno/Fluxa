import { Prisma, type FormaPagamento, type MovimentacaoCaixa, type TipoMovimentacao } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { roleAtendeMinimo, type RoleUsuarioKey } from "../../config/constants";
import { emitirParaLoja } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../sockets/events";
import * as auditoriaService from "../auditoria/auditoria.service";
import { calcularResumoSaldoTurno } from "../turnos/saldoCaixa.util";
import { getFiscalAdapter, getMaquininhaAdapter } from "../integracoes/integracoes.factory";

interface ContextoRequisicao {
  usuarioId: string;
  roleNaLoja?: RoleUsuarioKey;
  ip?: string;
  userAgent?: string;
}

interface CriarMovimentacaoInput {
  tipo: TipoMovimentacao;
  formaPagamento?: FormaPagamento;
  valor: number;
  motivo?: string;
  descricao?: string;
  vendaReferenciaId?: string;
}

const ACAO_AUDITORIA_POR_TIPO = {
  VENDA: "MOVIMENTACAO_CRIADA",
  SANGRIA: "SANGRIA",
  SUPRIMENTO: "SUPRIMENTO",
  CANCELAMENTO: "CANCELAMENTO",
  DEVOLUCAO: "DEVOLUCAO",
  AJUSTE: "AJUSTE",
} as const;

export async function criar(turnoId: string, input: CriarMovimentacaoInput, ctx: ContextoRequisicao) {
  const turno = await prisma.turnoCaixa.findUnique({
    where: { id: turnoId },
    include: { loja: { include: { configuracao: true } } },
  });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  if (turno.status !== "ABERTO") {
    throw new AppError("Este caixa já foi fechado — não é possível lançar novas movimentações.", 409);
  }

  const config = turno.loja.configuracao;

  if (input.tipo === "SANGRIA" && !roleAtendeMinimo(ctx.roleNaLoja ?? "OPERADOR", "SUPERVISOR")) {
    throw new AppError("Sangria exige autorização de supervisor, gerente ou admin.", 403);
  }
  if (input.tipo === "AJUSTE" && !roleAtendeMinimo(ctx.roleNaLoja ?? "OPERADOR", "GERENTE")) {
    throw new AppError("Lançamento manual de ajuste exige autorização de gerente ou admin.", 403);
  }

  let vendaReferencia: MovimentacaoCaixa | null = null;
  if (input.tipo === "CANCELAMENTO" || input.tipo === "DEVOLUCAO") {
    vendaReferencia = await prisma.movimentacaoCaixa.findUnique({
      where: { id: input.vendaReferenciaId! },
    });
    if (!vendaReferencia || vendaReferencia.tipo !== "VENDA" || vendaReferencia.status !== "ATIVA") {
      throw new AppError("Venda de referência inválida, inexistente ou já estornada.", 400);
    }
    if (input.valor > Number(vendaReferencia.valor)) {
      throw new AppError("Valor do cancelamento/devolução não pode ser maior que a venda original.", 400);
    }
  }

  // Sangria/suprimento são sempre movimentação física de dinheiro na gaveta.
  // Cancelamento/devolução sempre usa a forma de pagamento da venda original
  // (é dela que o valor precisa ser subtraído), nunca a enviada pelo cliente.
  const formaPagamento: FormaPagamento | undefined =
    input.tipo === "SANGRIA" || input.tipo === "SUPRIMENTO"
      ? "DINHEIRO"
      : vendaReferencia
        ? (vendaReferencia.formaPagamento ?? undefined)
        : input.formaPagamento;

  const valorMinimoConferencia = config?.valorMinimoConferenciaCruzada ?? new Prisma.Decimal(200);
  const exigeConferenciaCruzada =
    (input.tipo === "SANGRIA" || input.tipo === "SUPRIMENTO") &&
    new Prisma.Decimal(input.valor).greaterThanOrEqualTo(valorMinimoConferencia);

  const movimentacao = await prisma.$transaction(async (tx) => {
    const criada = await tx.movimentacaoCaixa.create({
      data: {
        turnoId,
        tipo: input.tipo,
        formaPagamento,
        valor: input.valor,
        motivo: input.motivo,
        descricao: input.descricao,
        vendaReferenciaId: input.vendaReferenciaId,
        operadorId: ctx.usuarioId,
        status: exigeConferenciaCruzada ? "PENDENTE_CONFERENCIA" : "ATIVA",
      },
    });

    if (vendaReferencia) {
      await tx.movimentacaoCaixa.update({
        where: { id: vendaReferencia.id },
        data: { status: "ESTORNADA", motivoEstorno: input.motivo, estornadaEm: new Date() },
      });
    }

    return criada;
  });

  // Integrações (stub nesta v1): emissão fiscal para toda venda, conciliação
  // de maquininha para débito/crédito. Nunca bloqueiam a venda em si.
  if (movimentacao.tipo === "VENDA") {
    const fiscal = getFiscalAdapter();
    const resultadoFiscal = await fiscal.emitirCupom({
      movimentacaoId: movimentacao.id,
      valor: movimentacao.valor.toString(),
      formaPagamento: movimentacao.formaPagamento ?? "OUTRO",
      lojaId: turno.lojaId,
    });
    await prisma.integracaoLog.create({
      data: {
        tipo: "FISCAL",
        movimentacaoId: movimentacao.id,
        status: resultadoFiscal.simulado ? "SIMULADO" : resultadoFiscal.sucesso ? "SUCESSO" : "ERRO",
        payloadResposta: resultadoFiscal as unknown as Prisma.InputJsonValue,
      },
    });

    if (movimentacao.formaPagamento === "DEBITO" || movimentacao.formaPagamento === "CREDITO") {
      const maquininha = getMaquininhaAdapter();
      const resultadoPagamento = await maquininha.iniciarPagamento({
        movimentacaoId: movimentacao.id,
        valor: movimentacao.valor.toString(),
        tipo: movimentacao.formaPagamento,
      });
      await prisma.integracaoLog.create({
        data: {
          tipo: "MAQUININHA",
          movimentacaoId: movimentacao.id,
          status: resultadoPagamento.simulado ? "SIMULADO" : resultadoPagamento.sucesso ? "SUCESSO" : "ERRO",
          payloadResposta: resultadoPagamento as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: ACAO_AUDITORIA_POR_TIPO[movimentacao.tipo],
    entidade: "MovimentacaoCaixa",
    entidadeId: movimentacao.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detalhes: { tipo: movimentacao.tipo, valor: input.valor, formaPagamento, motivo: input.motivo },
  });

  emitirParaLoja(turno.lojaId, SOCKET_EVENTS.MOVIMENTACAO_CRIADA, {
    turnoId,
    movimentacaoId: movimentacao.id,
    tipo: movimentacao.tipo,
  });

  // Alerta de teto de gaveta — só dispara para movimentações que afetam dinheiro físico.
  if (formaPagamento === "DINHEIRO" && movimentacao.status === "ATIVA") {
    const resumo = await calcularResumoSaldoTurno(turnoId);
    const tetoGaveta = config?.tetoGavetaDinheiro ?? new Prisma.Decimal(500);
    if (resumo.saldoPorForma.DINHEIRO.greaterThanOrEqualTo(tetoGaveta)) {
      await auditoriaService.registrar({
        lojaId: turno.lojaId,
        usuarioId: ctx.usuarioId,
        acao: "ALERTA_TETO_GAVETA",
        entidade: "TurnoCaixa",
        entidadeId: turnoId,
        detalhes: { saldoDinheiroAtual: resumo.saldoPorForma.DINHEIRO.toFixed(2), teto: tetoGaveta.toFixed(2) },
      });
      emitirParaLoja(turno.lojaId, SOCKET_EVENTS.ALERTA_TETO_GAVETA, {
        turnoId,
        saldoDinheiroAtual: resumo.saldoPorForma.DINHEIRO.toFixed(2),
        teto: tetoGaveta.toFixed(2),
      });
    }
  }

  return movimentacao;
}

export async function conferir(movimentacaoId: string, ctx: ContextoRequisicao) {
  const movimentacao = await prisma.movimentacaoCaixa.findUnique({
    where: { id: movimentacaoId },
    include: { turno: true },
  });
  if (!movimentacao) throw new AppError("Movimentação não encontrada.", 404);
  if (movimentacao.status !== "PENDENTE_CONFERENCIA") {
    throw new AppError("Esta movimentação não está aguardando conferência cruzada.", 409);
  }
  if (movimentacao.operadorId === ctx.usuarioId) {
    throw new AppError("A conferência cruzada exige uma segunda pessoa, diferente de quem lançou.", 403);
  }

  await prisma.movimentacaoCaixa.update({
    where: { id: movimentacaoId },
    data: { status: "ATIVA", conferidoPorId: ctx.usuarioId, conferidoEm: new Date() },
  });

  await auditoriaService.registrar({
    lojaId: movimentacao.turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "CONFERENCIA_CRUZADA",
    entidade: "MovimentacaoCaixa",
    entidadeId: movimentacaoId,
    detalhes: { operadorOriginalId: movimentacao.operadorId, valor: movimentacao.valor.toFixed(2) },
  });
}

export async function listarPorTurno(turnoId: string) {
  return prisma.movimentacaoCaixa.findMany({
    where: { turnoId },
    include: {
      operador: { select: { id: true, nome: true } },
      conferidoPor: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
