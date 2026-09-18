import { Prisma, type PeriodoTurno, type TurnoCaixa } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { proximoNumeroSequencial } from "../../utils/contador.util";
import { emitirParaLoja } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../sockets/events";
import * as auditoriaService from "../auditoria/auditoria.service";
import { calcularResumoSaldoTurno } from "./saldoCaixa.util";

interface ContextoRequisicao {
  usuarioId: string;
  roleNaLoja?: string;
  ip?: string;
  userAgent?: string;
}

class TurnoJaAbertoError extends Error {
  constructor(public turno: TurnoCaixa & { operadorResponsavelAtual: { nome: string } }) {
    super("Turno já aberto");
  }
}

export async function calcularSugestaoFundoTroco(
  terminalId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<Prisma.Decimal | null> {
  const terminal = await client.terminal.findUnique({
    where: { id: terminalId },
    include: { loja: { include: { configuracao: true } } },
  });
  if (!terminal) return null;

  const dias = terminal.loja.configuracao?.diasHistoricoMediaTroco ?? 30;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const turnosFechados = await client.turnoCaixa.findMany({
    where: { terminalId, status: "FECHADO", dataAbertura: { gte: desde } },
    select: { fundoTrocoInformado: true },
  });

  if (turnosFechados.length === 0) return null;

  const soma = turnosFechados.reduce(
    (acc, t) => acc.plus(t.fundoTrocoInformado),
    new Prisma.Decimal(0)
  );
  return soma.div(turnosFechados.length);
}

export async function sugestaoFundoTroco(terminalId: string) {
  const sugestao = await calcularSugestaoFundoTroco(terminalId);
  return { sugestao: sugestao ? sugestao.toFixed(2) : null };
}

interface AbrirTurnoInput {
  terminalId: string;
  periodo: PeriodoTurno;
  fundoTrocoInformado: number;
  observacoesAbertura?: string;
}

export async function abrirTurno(input: AbrirTurnoInput, ctx: ContextoRequisicao) {
  const terminal = await prisma.terminal.findUnique({ where: { id: input.terminalId } });
  if (!terminal || !terminal.ativo) {
    throw new AppError("Terminal inválido ou inativo.", 404);
  }

  try {
    const turno = await prisma.$transaction(async (tx) => {
      // Trava a linha do terminal para serializar tentativas concorrentes de
      // abertura no mesmo terminal — é a garantia real contra duplicidade,
      // independente do índice único parcial (defesa em profundidade).
      // Os ids do Prisma são String/text (uuid gerado em JS), não o tipo
      // nativo `uuid` do Postgres — comparar como texto simples, sem cast.
      await tx.$executeRaw`SELECT id FROM terminais WHERE id = ${input.terminalId} FOR UPDATE`;

      const existente = await tx.turnoCaixa.findFirst({
        where: { terminalId: input.terminalId, status: "ABERTO" },
        include: { operadorResponsavelAtual: { select: { nome: true } } },
      });
      if (existente) {
        throw new TurnoJaAbertoError(existente);
      }

      const numeroSequencial = await proximoNumeroSequencial(
        tx,
        terminal.lojaId,
        `turno:${terminal.id}`
      );
      const sugestao = await calcularSugestaoFundoTroco(terminal.id, tx);

      return tx.turnoCaixa.create({
        data: {
          lojaId: terminal.lojaId,
          terminalId: terminal.id,
          numeroSequencial,
          periodo: input.periodo,
          operadorAberturaId: ctx.usuarioId,
          operadorResponsavelAtualId: ctx.usuarioId,
          fundoTrocoInformado: input.fundoTrocoInformado,
          fundoTrocoSugerido: sugestao ?? undefined,
          observacoesAbertura: input.observacoesAbertura,
        },
      });
    });

    await auditoriaService.registrar({
      lojaId: terminal.lojaId,
      usuarioId: ctx.usuarioId,
      acao: "ABERTURA_CAIXA",
      entidade: "TurnoCaixa",
      entidadeId: turno.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      detalhes: { terminalId: terminal.id, fundoTrocoInformado: input.fundoTrocoInformado },
    });
    emitirParaLoja(terminal.lojaId, SOCKET_EVENTS.TURNO_ABERTO, {
      turnoId: turno.id,
      terminalId: terminal.id,
    });

    return turno;
  } catch (err) {
    if (err instanceof TurnoJaAbertoError) {
      await auditoriaService.registrar({
        lojaId: terminal.lojaId,
        usuarioId: ctx.usuarioId,
        acao: "TENTATIVA_ABERTURA_DUPLICADA",
        entidade: "Terminal",
        entidadeId: terminal.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      const desde = err.turno.dataAbertura.toLocaleString("pt-BR");
      throw new AppError(
        `Já existe um caixa aberto neste terminal desde ${desde}, responsável: ${err.turno.operadorResponsavelAtual.nome}. Feche-o antes de abrir um novo.`,
        409
      );
    }
    throw err;
  }
}

interface TrocarOperadorInput {
  operadorNovoId: string;
  motivo?: string;
}

export async function trocarOperador(
  turnoId: string,
  input: TrocarOperadorInput,
  ctx: ContextoRequisicao
) {
  const turno = await prisma.turnoCaixa.findUnique({ where: { id: turnoId } });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  if (turno.status !== "ABERTO") throw new AppError("Turno já está fechado.", 409);

  const operadorNovo = await prisma.usuario.findUnique({ where: { id: input.operadorNovoId } });
  if (!operadorNovo || !operadorNovo.ativo) {
    throw new AppError("Operador informado é inválido ou está inativo.", 400);
  }

  const autorizadoPorId = ctx.usuarioId !== turno.operadorResponsavelAtualId ? ctx.usuarioId : undefined;

  await prisma.$transaction([
    prisma.trocaOperador.create({
      data: {
        turnoId,
        operadorAnteriorId: turno.operadorResponsavelAtualId,
        operadorNovoId: input.operadorNovoId,
        motivo: input.motivo,
        autorizadoPorId,
      },
    }),
    prisma.turnoCaixa.update({
      where: { id: turnoId },
      data: { operadorResponsavelAtualId: input.operadorNovoId },
    }),
  ]);

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "TROCA_OPERADOR",
    entidade: "TurnoCaixa",
    entidadeId: turnoId,
    detalhes: {
      operadorAnteriorId: turno.operadorResponsavelAtualId,
      operadorNovoId: input.operadorNovoId,
      motivo: input.motivo,
    },
  });
}

/**
 * Leitura X: foto do caixa a qualquer momento, sem nenhum efeito colateral —
 * não cria nem altera FechamentoCaixa, pode ser chamada quantas vezes quiser.
 */
export async function leituraX(turnoId: string, ctx: ContextoRequisicao) {
  const turno = await prisma.turnoCaixa.findUnique({
    where: { id: turnoId },
    include: {
      terminal: true,
      operadorResponsavelAtual: { select: { id: true, nome: true } },
      operadorAbertura: { select: { id: true, nome: true } },
    },
  });
  if (!turno) throw new AppError("Turno não encontrado.", 404);

  const resumo = await calcularResumoSaldoTurno(turnoId);

  await auditoriaService.registrar({
    lojaId: turno.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "LEITURA_X",
    entidade: "TurnoCaixa",
    entidadeId: turnoId,
  });

  return { turno, resumo };
}

interface ListarTurnosFiltros {
  terminalId?: string;
  status?: "ABERTO" | "FECHADO";
  pagina: number;
  tamanhoPagina: number;
}

export async function listar(filtros: ListarTurnosFiltros, ctx: ContextoRequisicao) {
  const where: Prisma.TurnoCaixaWhereInput = {
    terminalId: filtros.terminalId,
    status: filtros.status,
  };

  if (ctx.roleNaLoja === "OPERADOR") {
    where.OR = [
      { operadorAberturaId: ctx.usuarioId },
      { operadorResponsavelAtualId: ctx.usuarioId },
    ];
  }

  const [itens, total] = await Promise.all([
    prisma.turnoCaixa.findMany({
      where,
      include: {
        terminal: { select: { id: true, nome: true, codigo: true } },
        operadorResponsavelAtual: { select: { id: true, nome: true } },
        fechamento: { select: { status: true, classificacaoGeral: true, divergenciaTotal: true } },
      },
      orderBy: { dataAbertura: "desc" },
      skip: (filtros.pagina - 1) * filtros.tamanhoPagina,
      take: filtros.tamanhoPagina,
    }),
    prisma.turnoCaixa.count({ where }),
  ]);

  return { itens, total, pagina: filtros.pagina, tamanhoPagina: filtros.tamanhoPagina };
}

export async function buscarPorId(turnoId: string) {
  const turno = await prisma.turnoCaixa.findUnique({
    where: { id: turnoId },
    include: {
      terminal: true,
      operadorResponsavelAtual: { select: { id: true, nome: true } },
      operadorAbertura: { select: { id: true, nome: true } },
      operadorFechamento: { select: { id: true, nome: true } },
    },
  });
  if (!turno) throw new AppError("Turno não encontrado.", 404);
  return turno;
}
