import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import type { AtualizarClienteInput, CriarClienteInput, ListarClientesQuery } from "./clientes.schemas";

interface ContextoRequisicao {
  usuarioId: string;
  lojaId: string;
}

async function garantirCpfLivre(lojaId: string, cpf: string | null | undefined, ignorarId?: string) {
  if (!cpf) return;
  const existente = await prisma.cliente.findUnique({ where: { lojaId_cpf: { lojaId, cpf } } });
  if (existente && existente.id !== ignorarId) {
    throw new AppError(`Já existe um cliente com este CPF: ${existente.nome}.`, 409);
  }
}

export async function criar(input: CriarClienteInput, ctx: ContextoRequisicao) {
  await garantirCpfLivre(ctx.lojaId, input.cpf);

  const cliente = await prisma.cliente.create({
    data: { ...input, tags: input.tags ?? [], lojaId: ctx.lojaId, criadoPorId: ctx.usuarioId },
  });

  await auditoriaService.registrar({
    lojaId: ctx.lojaId,
    usuarioId: ctx.usuarioId,
    acao: "CLIENTE_CRIADO",
    entidade: "Cliente",
    entidadeId: cliente.id,
    detalhes: { nome: cliente.nome },
  });

  return cliente;
}

function filtroBusca(lojaId: string, query: Pick<ListarClientesQuery, "busca" | "tag" | "status">) {
  const where: Prisma.ClienteWhereInput = { lojaId };
  if (query.status === "ativos") where.ativo = true;
  if (query.status === "inativos") where.ativo = false;
  if (query.tag) where.tags = { has: query.tag.toLowerCase() };

  if (query.busca) {
    const digitos = query.busca.replace(/\D/g, "");
    const ou: Prisma.ClienteWhereInput[] = [
      { nome: { contains: query.busca, mode: "insensitive" } },
      { email: { contains: query.busca, mode: "insensitive" } },
    ];
    // Busca por telefone/CPF só com 3+ dígitos, senão "a1" casaria qualquer telefone com "1".
    if (digitos.length >= 3) {
      ou.push({ telefone: { contains: digitos } }, { cpf: { contains: digitos } });
    }
    where.OR = ou;
  }
  return where;
}

/** Resumo de atendimentos de vários clientes de uma vez (evita N+1 na listagem). */
async function resumoAtendimentos(clienteIds: string[]) {
  if (clienteIds.length === 0) return new Map<string, { ultimaVisita: Date | null; atendimentos: number; proximo: Date | null }>();

  const [concluidos, futuros] = await Promise.all([
    prisma.agendamento.groupBy({
      by: ["clienteId"],
      where: { clienteId: { in: clienteIds }, status: "CONCLUIDO" },
      _max: { inicio: true },
      _count: { _all: true },
    }),
    prisma.agendamento.groupBy({
      by: ["clienteId"],
      where: { clienteId: { in: clienteIds }, status: { in: ["AGENDADO", "CONFIRMADO"] }, inicio: { gte: new Date() } },
      _min: { inicio: true },
    }),
  ]);

  const mapa = new Map<string, { ultimaVisita: Date | null; atendimentos: number; proximo: Date | null }>();
  for (const id of clienteIds) mapa.set(id, { ultimaVisita: null, atendimentos: 0, proximo: null });
  for (const c of concluidos) {
    const item = mapa.get(c.clienteId)!;
    item.ultimaVisita = c._max.inicio;
    item.atendimentos = c._count._all;
  }
  for (const f of futuros) mapa.get(f.clienteId)!.proximo = f._min.inicio;
  return mapa;
}

export async function listar(lojaId: string, query: ListarClientesQuery) {
  const where = filtroBusca(lojaId, query);

  // "Última visita" depende de agendamentos, não de coluna do cliente — ordena
  // em memória sobre o conjunto filtrado (base de clientes de uma loja é pequena
  // o bastante para isso; os demais critérios ordenam direto no banco).
  if (query.ordenar === "ultimaVisita") {
    const todos = await prisma.cliente.findMany({ where, orderBy: { nome: "asc" } });
    const resumo = await resumoAtendimentos(todos.map((c) => c.id));
    const ordenados = todos
      .map((c) => ({ ...c, ...resumo.get(c.id)! }))
      .sort((a, b) => (b.ultimaVisita?.getTime() ?? 0) - (a.ultimaVisita?.getTime() ?? 0));
    const inicio = (query.pagina - 1) * query.tamanhoPagina;
    return {
      itens: ordenados.slice(inicio, inicio + query.tamanhoPagina),
      total: ordenados.length,
      pagina: query.pagina,
      tamanhoPagina: query.tamanhoPagina,
    };
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: query.ordenar === "recentes" ? { createdAt: "desc" } : { nome: "asc" },
      skip: (query.pagina - 1) * query.tamanhoPagina,
      take: query.tamanhoPagina,
    }),
    prisma.cliente.count({ where }),
  ]);
  const resumo = await resumoAtendimentos(clientes.map((c) => c.id));

  return {
    itens: clientes.map((c) => ({ ...c, ...resumo.get(c.id)! })),
    total,
    pagina: query.pagina,
    tamanhoPagina: query.tamanhoPagina,
  };
}

/** Busca enxuta para o seletor de cliente no formulário de agendamento. */
export async function buscarRapido(lojaId: string, busca: string) {
  return prisma.cliente.findMany({
    where: filtroBusca(lojaId, { busca, status: "ativos" }),
    select: { id: true, nome: true, telefone: true, cpf: true, tags: true },
    orderBy: { nome: "asc" },
    take: 8,
  });
}

export async function obter(lojaId: string, id: string) {
  const cliente = await prisma.cliente.findFirst({
    where: { id, lojaId },
    include: { criadoPor: { select: { id: true, nome: true } } },
  });
  if (!cliente) throw new AppError("Cliente não encontrado.", 404);

  const [porStatus, gasto, ultimo, proximo] = await Promise.all([
    prisma.agendamento.groupBy({ by: ["status"], where: { clienteId: id }, _count: { _all: true } }),
    prisma.agendamento.aggregate({ where: { clienteId: id, status: "CONCLUIDO" }, _sum: { valor: true } }),
    prisma.agendamento.findFirst({
      where: { clienteId: id, status: "CONCLUIDO" },
      orderBy: { inicio: "desc" },
      select: { inicio: true, servico: { select: { nome: true } } },
    }),
    prisma.agendamento.findFirst({
      where: { clienteId: id, status: { in: ["AGENDADO", "CONFIRMADO"] }, inicio: { gte: new Date() } },
      orderBy: { inicio: "asc" },
      select: { id: true, inicio: true, status: true, servico: { select: { nome: true } } },
    }),
  ]);

  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const concluidos = contagem.CONCLUIDO ?? 0;
  const faltas = contagem.FALTOU ?? 0;
  // Taxa de faltas sobre o que já "aconteceu" (compareceu ou faltou) — cancelado com antecedência não pesa contra o cliente.
  const baseFaltas = concluidos + faltas;

  return {
    ...cliente,
    estatisticas: {
      totalAgendamentos: porStatus.reduce((soma, s) => soma + s._count._all, 0),
      concluidos,
      faltas,
      cancelados: contagem.CANCELADO ?? 0,
      taxaFaltas: baseFaltas > 0 ? Math.round((faltas / baseFaltas) * 1000) / 10 : 0,
      totalGasto: (gasto._sum.valor ?? new Prisma.Decimal(0)).toFixed(2),
      ticketMedio: concluidos > 0 ? (gasto._sum.valor ?? new Prisma.Decimal(0)).div(concluidos).toFixed(2) : "0.00",
      ultimaVisita: ultimo?.inicio ?? null,
      ultimoServico: ultimo?.servico?.nome ?? null,
      proximoAgendamento: proximo,
    },
  };
}

export async function atualizar(lojaId: string, id: string, input: AtualizarClienteInput, ctx: ContextoRequisicao) {
  const atual = await prisma.cliente.findFirst({ where: { id, lojaId } });
  if (!atual) throw new AppError("Cliente não encontrado.", 404);
  if (input.cpf !== undefined) await garantirCpfLivre(lojaId, input.cpf, id);

  const atualizado = await prisma.cliente.update({ where: { id }, data: input });

  // Guarda só os campos que de fato mudaram, com antes/depois — dá para responder "quem trocou o telefone?".
  const alteracoes: Record<string, { de: unknown; para: unknown }> = {};
  for (const chave of Object.keys(input) as (keyof AtualizarClienteInput)[]) {
    const de = atual[chave as keyof typeof atual];
    const para = atualizado[chave as keyof typeof atualizado];
    if (JSON.stringify(de) !== JSON.stringify(para)) alteracoes[chave] = { de, para };
  }

  if (Object.keys(alteracoes).length > 0) {
    await auditoriaService.registrar({
      lojaId,
      usuarioId: ctx.usuarioId,
      acao: "CLIENTE_ATUALIZADO",
      entidade: "Cliente",
      entidadeId: id,
      detalhes: { alteracoes },
    });
  }

  return atualizado;
}

export async function listarTags(lojaId: string) {
  const linhas = await prisma.$queryRaw<{ tag: string; total: bigint }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS total
    FROM clientes
    WHERE "lojaId" = ${lojaId} AND ativo = true
    GROUP BY tag
    ORDER BY total DESC, tag ASC
    LIMIT 50
  `;
  return linhas.map((l) => ({ tag: l.tag, total: Number(l.total) }));
}

export async function listarNotas(lojaId: string, clienteId: string) {
  await garantirClienteDaLoja(lojaId, clienteId);
  return prisma.clienteNota.findMany({
    where: { clienteId },
    include: { autor: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function criarNota(lojaId: string, clienteId: string, texto: string, autorId: string) {
  await garantirClienteDaLoja(lojaId, clienteId);
  return prisma.clienteNota.create({
    data: { clienteId, texto, autorId },
    include: { autor: { select: { id: true, nome: true } } },
  });
}

export async function historico(lojaId: string, clienteId: string) {
  await garantirClienteDaLoja(lojaId, clienteId);
  return prisma.agendamento.findMany({
    where: { clienteId, lojaId },
    include: {
      servico: { select: { id: true, nome: true, cor: true } },
      profissional: { select: { id: true, nome: true } },
    },
    orderBy: { inicio: "desc" },
    take: 200,
  });
}

export async function exportar(lojaId: string, query: Pick<ListarClientesQuery, "busca" | "tag" | "status">) {
  const clientes = await prisma.cliente.findMany({ where: filtroBusca(lojaId, query), orderBy: { nome: "asc" } });
  const resumo = await resumoAtendimentos(clientes.map((c) => c.id));
  return clientes.map((c) => ({ ...c, ...resumo.get(c.id)! }));
}

async function garantirClienteDaLoja(lojaId: string, clienteId: string) {
  const existe = await prisma.cliente.findFirst({ where: { id: clienteId, lojaId }, select: { id: true } });
  if (!existe) throw new AppError("Cliente não encontrado.", 404);
}
