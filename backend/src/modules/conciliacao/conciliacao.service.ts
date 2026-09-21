import { Prisma, type StatusConciliacaoMovimentacao } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";

export * from "./importacao/importacao.service";
export * from "./motor/motor.service";
export * from "./taxas/taxas.service";
export * from "./taxas/recebiveis.service";

export async function listarExtratos(lojaId: string) {
  return prisma.extratoCartao.findMany({
    where: { lojaId },
    include: { importadoPor: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listarTransacoesDoExtrato(extratoId: string, lojaId: string) {
  const extrato = await prisma.extratoCartao.findUnique({ where: { id: extratoId } });
  if (!extrato || extrato.lojaId !== lojaId) throw new AppError("Extrato não encontrado.", 404);
  return prisma.transacaoExtratoCartao.findMany({ where: { extratoId }, orderBy: { dataVenda: "asc" } });
}

interface ListarConciliacoesFiltros {
  lojaId: string;
  status?: StatusConciliacaoMovimentacao;
  dataInicio?: Date;
  dataFim?: Date;
}

export async function listarConciliacoes(filtros: ListarConciliacoesFiltros) {
  return prisma.conciliacaoCartao.findMany({
    where: {
      lojaId: filtros.lojaId,
      statusMovimentacao: filtros.status,
      createdAt: { gte: filtros.dataInicio, lte: filtros.dataFim },
    },
    include: {
      movimentacao: {
        select: {
          id: true,
          valor: true,
          formaPagamento: true,
          createdAt: true,
          nsuMaquininha: true,
          turno: { select: { terminal: { select: { nome: true } } } },
        },
      },
      transacaoExtrato: true,
      resolvidoPor: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface ResumoConciliacao {
  conciliado: number;
  divergente: number;
  pendenteRevisao: number;
  semExtrato: number;
  semVenda: number;
  valorEmRisco: string;
}

export async function resumo(lojaId: string): Promise<ResumoConciliacao> {
  const registros = await prisma.conciliacaoCartao.findMany({
    where: { lojaId },
    select: { statusMovimentacao: true, statusTransacao: true, diferencaValor: true, movimentacaoId: true, movimentacao: { select: { valor: true } } },
  });

  const contagem = { conciliado: 0, divergente: 0, pendenteRevisao: 0, semExtrato: 0, semVenda: 0 };
  let valorEmRisco = new Prisma.Decimal(0);

  for (const r of registros) {
    if (r.statusTransacao === "SEM_VENDA") {
      contagem.semVenda += 1;
      continue;
    }
    switch (r.statusMovimentacao) {
      case "CONCILIADO":
        contagem.conciliado += 1;
        break;
      case "DIVERGENTE":
        contagem.divergente += 1;
        valorEmRisco = valorEmRisco.plus(r.diferencaValor?.abs() ?? new Prisma.Decimal(0));
        break;
      case "PENDENTE_REVISAO":
        contagem.pendenteRevisao += 1;
        break;
      case "SEM_EXTRATO":
        contagem.semExtrato += 1;
        if (r.movimentacao) valorEmRisco = valorEmRisco.plus(r.movimentacao.valor);
        break;
      case "MANUAL":
        break;
    }
  }

  return { ...contagem, valorEmRisco: valorEmRisco.toFixed(2) };
}

interface ResolverManualInput {
  conciliacaoId: string;
  lojaId: string;
  usuarioId: string;
  observacao: string;
  acao: "aceitar" | "vincular" | "rejeitar";
  transacaoExtratoId?: string;
}

/** Resolução manual de gerente: aceitar como está, vincular a uma transação específica, ou rejeitar. Observação é sempre obrigatória. */
export async function resolverManual(input: ResolverManualInput) {
  const registro = await prisma.conciliacaoCartao.findUnique({ where: { id: input.conciliacaoId } });
  if (!registro || registro.lojaId !== input.lojaId) {
    throw new AppError("Registro de conciliação não encontrado.", 404);
  }

  if (input.acao === "vincular") {
    if (!input.transacaoExtratoId) {
      throw new AppError("Informe a transação do extrato para vincular.", 400);
    }
    const transacao = await prisma.transacaoExtratoCartao.findUnique({ where: { id: input.transacaoExtratoId } });
    if (!transacao || transacao.usadaEmConciliacao) {
      throw new AppError("Transação do extrato inválida ou já usada em outra conciliação.", 422);
    }

    await prisma.$transaction([
      prisma.transacaoExtratoCartao.update({ where: { id: transacao.id }, data: { usadaEmConciliacao: true } }),
      prisma.conciliacaoCartao.update({
        where: { id: registro.id },
        data: {
          transacaoExtratoId: transacao.id,
          statusMovimentacao: "MANUAL",
          statusTransacao: "MANUAL",
          observacao: input.observacao,
          resolvidoPorId: input.usuarioId,
          resolvidoEm: new Date(),
        },
      }),
    ]);
  } else {
    await prisma.conciliacaoCartao.update({
      where: { id: registro.id },
      data: {
        statusMovimentacao: "MANUAL",
        statusTransacao: registro.transacaoExtratoId ? (input.acao === "rejeitar" ? "IGNORADO" : "MANUAL") : registro.statusTransacao,
        observacao: input.observacao,
        resolvidoPorId: input.usuarioId,
        resolvidoEm: new Date(),
      },
    });
  }

  await auditoriaService.registrar({
    lojaId: input.lojaId,
    usuarioId: input.usuarioId,
    acao: "CONCILIACAO_RESOLVIDA_MANUAL",
    entidade: "ConciliacaoCartao",
    entidadeId: registro.id,
    detalhes: { acao: input.acao, observacao: input.observacao },
  });

  return prisma.conciliacaoCartao.findUnique({ where: { id: registro.id } });
}
