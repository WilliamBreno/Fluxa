import { Prisma, type StatusAgendamento } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { emitirParaLoja } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../sockets/events";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import { STATUS_EDITAVEIS, STATUS_OCUPAM_HORARIO, podeTransicionar } from "./agendamentos.regras";
import type { AtualizarAgendamentoInput, CriarAgendamentoInput, ListarAgendamentosQuery } from "./agendamentos.schemas";

interface ContextoRequisicao {
  usuarioId: string;
  lojaId: string;
}

type Tx = Prisma.TransactionClient;

const INCLUDE_AGENDAMENTO = {
  cliente: { select: { id: true, nome: true, telefone: true, tags: true } },
  servico: { select: { id: true, nome: true, cor: true, duracaoMinutos: true } },
  profissional: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.AgendamentoInclude;

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Faltou",
};

async function formatadorHora(lojaId: string) {
  const loja = await prisma.loja.findUnique({ where: { id: lojaId }, select: { timezone: true } });
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: loja?.timezone ?? "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (d: Date) => fmt.format(d);
}

/**
 * Serializa agendamentos concorrentes do mesmo profissional/cliente com lock
 * consultivo do Postgres (liberado no fim da transação). Sem isso, dois
 * funcionários marcando o mesmo horário ao mesmo tempo passariam os dois pela
 * checagem de conflito antes de qualquer um gravar. Ordena as chaves para
 * que duas transações nunca peguem os mesmos locks em ordem inversa (deadlock).
 */
async function travarAgenda(tx: Tx, chaves: string[]) {
  for (const chave of [...new Set(chaves)].sort()) {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"agenda:" + chave}))`;
  }
}

async function verificarConflitos(
  tx: Tx,
  dados: { lojaId: string; clienteId: string; profissionalId: string | null; inicio: Date; fim: Date; ignorarId?: string }
) {
  const chaves = [`cliente:${dados.clienteId}`];
  if (dados.profissionalId) chaves.push(`profissional:${dados.profissionalId}`);
  await travarAgenda(tx, chaves);

  const ocupando: Prisma.AgendamentoWhereInput = {
    lojaId: dados.lojaId,
    status: { in: STATUS_OCUPAM_HORARIO },
    inicio: { lt: dados.fim },
    fim: { gt: dados.inicio },
    ...(dados.ignorarId ? { id: { not: dados.ignorarId } } : {}),
  };

  const hora = await formatadorHora(dados.lojaId);

  if (dados.profissionalId) {
    const conflito = await tx.agendamento.findFirst({
      where: { ...ocupando, profissionalId: dados.profissionalId },
      include: { cliente: { select: { nome: true } }, profissional: { select: { nome: true } } },
      orderBy: { inicio: "asc" },
    });
    if (conflito) {
      throw new AppError(
        `${conflito.profissional?.nome ?? "O profissional"} já atende ${conflito.cliente.nome} de ${hora(conflito.inicio)} até ${hora(conflito.fim).slice(-5)}.`,
        409
      );
    }
  }

  const conflitoCliente = await tx.agendamento.findFirst({
    where: { ...ocupando, clienteId: dados.clienteId },
    orderBy: { inicio: "asc" },
  });
  if (conflitoCliente) {
    throw new AppError(
      `Este cliente já tem um agendamento de ${hora(conflitoCliente.inicio)} até ${hora(conflitoCliente.fim).slice(-5)}.`,
      409
    );
  }
}

async function validarReferencias(
  tx: Tx,
  lojaId: string,
  refs: { clienteId?: string; servicoId?: string | null; profissionalId?: string | null }
) {
  const [cliente, servico, vinculo] = await Promise.all([
    refs.clienteId ? tx.cliente.findFirst({ where: { id: refs.clienteId, lojaId } }) : null,
    refs.servicoId ? tx.servico.findFirst({ where: { id: refs.servicoId, lojaId } }) : null,
    refs.profissionalId
      ? tx.usuarioLoja.findFirst({ where: { usuarioId: refs.profissionalId, lojaId, ativo: true, usuario: { ativo: true } } })
      : null,
  ]);

  if (refs.clienteId && !cliente) throw new AppError("Cliente não encontrado.", 404);
  if (cliente && !cliente.ativo) throw new AppError("Cliente inativo. Reative o cadastro antes de agendar.", 422);
  if (refs.servicoId && !servico) throw new AppError("Serviço não encontrado.", 404);
  if (servico && !servico.ativo) throw new AppError("Serviço inativo não pode ser agendado.", 422);
  if (refs.profissionalId && !vinculo) throw new AppError("Profissional não pertence a esta loja ou está inativo.", 422);

  return { cliente, servico };
}

function notificarAlteracao(lojaId: string, agendamentoId: string, acao: string) {
  emitirParaLoja(lojaId, SOCKET_EVENTS.AGENDAMENTO_ALTERADO, { id: agendamentoId, acao });
}

export async function criar(input: CriarAgendamentoInput, ctx: ContextoRequisicao) {
  const agendamento = await prisma.$transaction(async (tx) => {
    const { servico } = await validarReferencias(tx, ctx.lojaId, input);
    await verificarConflitos(tx, {
      lojaId: ctx.lojaId,
      clienteId: input.clienteId,
      profissionalId: input.profissionalId ?? null,
      inicio: input.inicio,
      fim: input.fim,
    });

    const criado = await tx.agendamento.create({
      data: {
        lojaId: ctx.lojaId,
        clienteId: input.clienteId,
        servicoId: input.servicoId ?? null,
        profissionalId: input.profissionalId ?? null,
        inicio: input.inicio,
        fim: input.fim,
        valor: input.valor ?? servico?.preco ?? null,
        observacoes: input.observacoes,
        criadoPorId: ctx.usuarioId,
      },
      include: INCLUDE_AGENDAMENTO,
    });

    await auditoriaService.registrar(
      {
        lojaId: ctx.lojaId,
        usuarioId: ctx.usuarioId,
        acao: "AGENDAMENTO_CRIADO",
        entidade: "Agendamento",
        entidadeId: criado.id,
        detalhes: {
          cliente: criado.cliente.nome,
          servico: criado.servico?.nome,
          profissional: criado.profissional?.nome,
          inicio: criado.inicio,
          fim: criado.fim,
        },
      },
      tx
    );
    return criado;
  });

  notificarAlteracao(ctx.lojaId, agendamento.id, "criado");
  return agendamento;
}

export async function listar(lojaId: string, query: ListarAgendamentosQuery) {
  return prisma.agendamento.findMany({
    where: {
      lojaId,
      inicio: { lt: query.fim },
      fim: { gt: query.inicio },
      profissionalId: query.profissionalId,
      clienteId: query.clienteId,
      status: query.status ? { in: query.status } : undefined,
    },
    include: INCLUDE_AGENDAMENTO,
    orderBy: { inicio: "asc" },
  });
}

export async function obter(lojaId: string, id: string) {
  const agendamento = await prisma.agendamento.findFirst({ where: { id, lojaId }, include: INCLUDE_AGENDAMENTO });
  if (!agendamento) throw new AppError("Agendamento não encontrado.", 404);

  const historico = await prisma.auditLog.findMany({
    where: { lojaId, entidade: "Agendamento", entidadeId: id },
    include: { usuario: { select: { nome: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { ...agendamento, historico };
}

export async function atualizar(lojaId: string, id: string, input: AtualizarAgendamentoInput, ctx: ContextoRequisicao) {
  const resultado = await prisma.$transaction(async (tx) => {
    const atual = await tx.agendamento.findFirst({ where: { id, lojaId } });
    if (!atual) throw new AppError("Agendamento não encontrado.", 404);
    if (!STATUS_EDITAVEIS.includes(atual.status)) {
      throw new AppError(`Agendamento ${ROTULO_STATUS[atual.status].toLowerCase()} não pode mais ser alterado.`, 422);
    }

    // Só valida o que mudou: reagendar um atendimento cujo serviço foi
    // desativado depois (ou cujo profissional saiu) não pode ser bloqueado.
    const { servico } = await validarReferencias(tx, lojaId, {
      servicoId: input.servicoId !== atual.servicoId ? input.servicoId : undefined,
      profissionalId: input.profissionalId !== atual.profissionalId ? input.profissionalId : undefined,
    });

    const inicio = input.inicio ?? atual.inicio;
    const fim = input.fim ?? atual.fim;
    if (fim <= inicio) throw new AppError("O término precisa ser depois do início.", 400);

    const profissionalId = input.profissionalId !== undefined ? input.profissionalId : atual.profissionalId;
    const mudouHorario = inicio.getTime() !== atual.inicio.getTime() || fim.getTime() !== atual.fim.getTime();

    if (mudouHorario || profissionalId !== atual.profissionalId) {
      await verificarConflitos(tx, { lojaId, clienteId: atual.clienteId, profissionalId, inicio, fim, ignorarId: id });
    }

    // Trocar de serviço sem informar valor puxa o preço do novo serviço.
    const valor =
      input.valor !== undefined ? input.valor : input.servicoId && input.servicoId !== atual.servicoId ? servico?.preco : undefined;

    // Reagendou um horário já confirmado: o cliente precisa confirmar de novo o novo horário.
    const voltaParaAgendado = mudouHorario && atual.status === "CONFIRMADO";

    const atualizado = await tx.agendamento.update({
      where: { id },
      data: {
        servicoId: input.servicoId,
        profissionalId: input.profissionalId,
        inicio,
        fim,
        valor,
        observacoes: input.observacoes,
        ...(voltaParaAgendado ? { status: "AGENDADO", confirmadoEm: null } : {}),
      },
      include: INCLUDE_AGENDAMENTO,
    });

    await auditoriaService.registrar(
      {
        lojaId,
        usuarioId: ctx.usuarioId,
        acao: "AGENDAMENTO_ATUALIZADO",
        entidade: "Agendamento",
        entidadeId: id,
        detalhes: {
          reagendado: mudouHorario,
          de: mudouHorario ? { inicio: atual.inicio, fim: atual.fim } : undefined,
          para: mudouHorario ? { inicio, fim } : undefined,
          confirmacaoReiniciada: voltaParaAgendado,
          alteracoes: { ...input, inicio: undefined, fim: undefined },
        },
      },
      tx
    );

    return atualizado;
  });

  notificarAlteracao(lojaId, id, "atualizado");
  return resultado;
}

export async function alterarStatus(
  lojaId: string,
  id: string,
  novo: StatusAgendamento,
  motivo: string | null,
  ctx: ContextoRequisicao
) {
  const atual = await prisma.agendamento.findFirst({ where: { id, lojaId } });
  if (!atual) throw new AppError("Agendamento não encontrado.", 404);
  if (atual.status === novo) return prisma.agendamento.findUniqueOrThrow({ where: { id }, include: INCLUDE_AGENDAMENTO });

  if (!podeTransicionar(atual.status, novo)) {
    throw new AppError(
      `Não é possível mudar de "${ROTULO_STATUS[atual.status]}" para "${ROTULO_STATUS[novo]}".`,
      422
    );
  }

  const agora = new Date();
  if (novo === "FALTOU" && atual.inicio > agora) {
    throw new AppError("Só é possível marcar falta depois do horário agendado.", 422);
  }

  const data: Prisma.AgendamentoUpdateInput = { status: novo };
  if (novo === "CONFIRMADO") data.confirmadoEm = agora;
  if (novo === "AGENDADO") data.confirmadoEm = null;
  if (novo === "EM_ATENDIMENTO") data.iniciadoEm = agora;
  if (novo === "CONCLUIDO") {
    data.concluidoEm = agora;
    if (!atual.iniciadoEm) data.iniciadoEm = atual.inicio < agora ? atual.inicio : agora;
  }
  if (novo === "CANCELADO") {
    data.canceladoEm = agora;
    data.motivoCancelamento = motivo;
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.agendamento.update({ where: { id }, data, include: INCLUDE_AGENDAMENTO });
    await auditoriaService.registrar(
      {
        lojaId,
        usuarioId: ctx.usuarioId,
        acao: "AGENDAMENTO_STATUS_ALTERADO",
        entidade: "Agendamento",
        entidadeId: id,
        detalhes: { de: atual.status, para: novo, motivo: motivo ?? undefined },
      },
      tx
    );
    return resultado;
  });

  notificarAlteracao(lojaId, id, "status");
  return atualizado;
}

export async function resumo(lojaId: string, inicio: Date, fim: Date) {
  const where: Prisma.AgendamentoWhereInput = { lojaId, inicio: { gte: inicio, lt: fim } };
  const [porStatus, previsto, realizado] = await Promise.all([
    prisma.agendamento.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.agendamento.aggregate({
      where: { ...where, status: { in: STATUS_OCUPAM_HORARIO } },
      _sum: { valor: true },
    }),
    prisma.agendamento.aggregate({ where: { ...where, status: "CONCLUIDO" }, _sum: { valor: true } }),
  ]);

  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])) as Partial<Record<StatusAgendamento, number>>;
  const total = porStatus.reduce((soma, s) => soma + s._count._all, 0);
  const faltas = contagem.FALTOU ?? 0;
  const compareceram = contagem.CONCLUIDO ?? 0;

  return {
    total,
    porStatus: contagem,
    receitaPrevista: (previsto._sum.valor ?? new Prisma.Decimal(0)).toFixed(2),
    receitaRealizada: (realizado._sum.valor ?? new Prisma.Decimal(0)).toFixed(2),
    taxaFaltas: compareceram + faltas > 0 ? Math.round((faltas / (compareceram + faltas)) * 1000) / 10 : 0,
  };
}

/** Funcionários ativos da loja que podem receber agendamento (qualquer perfil). */
export async function listarProfissionais(lojaId: string) {
  const vinculos = await prisma.usuarioLoja.findMany({
    where: { lojaId, ativo: true, usuario: { ativo: true } },
    select: { role: true, usuario: { select: { id: true, nome: true } } },
    orderBy: { usuario: { nome: "asc" } },
  });
  return vinculos.map((v) => ({ id: v.usuario.id, nome: v.usuario.nome, role: v.role }));
}
