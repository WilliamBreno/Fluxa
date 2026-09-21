import { Prisma, type MovimentacaoCaixa, type TransacaoExtratoCartao } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import * as auditoriaService from "../../auditoria/auditoria.service";
import { modalidadesCompativeis, valorComparacaoMovimentacao } from "./candidatos";

export interface ExecutarConciliacaoInput {
  lojaId: string;
  dataInicio: Date;
  dataFim: Date;
  usuarioId: string;
}

export interface ResumoExecucao {
  conciliadasNivel1: number;
  conciliadasNivel2: number;
  divergentes: number;
  pendentesRevisao: number;
  semExtrato: number;
  semVenda: number;
}

/**
 * Motor de conciliação — nunca adivinha: só concilia automaticamente quando
 * existe exatamente 1 candidato. Múltiplos candidatos sempre viram
 * PENDENTE_REVISAO para resolução manual (ver conciliacao.service.ts::resolverManual).
 */
export async function executarConciliacao(input: ExecutarConciliacaoInput): Promise<ResumoExecucao> {
  const configuracao = await prisma.configuracaoLoja.findUnique({ where: { lojaId: input.lojaId } });
  const toleranciaDias = configuracao?.toleranciaDiasConciliacaoCartao ?? 2;
  const bufferMs = (toleranciaDias + 1) * 24 * 60 * 60 * 1000;

  const movimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: {
      tipo: { in: ["VENDA", "CANCELAMENTO", "DEVOLUCAO"] },
      formaPagamento: { in: ["DEBITO", "CREDITO"] },
      status: "ATIVA",
      turno: { lojaId: input.lojaId },
      createdAt: { gte: input.dataInicio, lte: input.dataFim },
      conciliacaoCartao: null,
    },
  });

  const transacoes = await prisma.transacaoExtratoCartao.findMany({
    where: {
      lojaId: input.lojaId,
      usadaEmConciliacao: false,
      dataVenda: {
        gte: new Date(input.dataInicio.getTime() - bufferMs),
        lte: new Date(input.dataFim.getTime() + bufferMs),
      },
    },
  });

  const transacoesDisponiveis = new Map(transacoes.map((t) => [t.id, t]));
  const resumo: ResumoExecucao = {
    conciliadasNivel1: 0,
    conciliadasNivel2: 0,
    divergentes: 0,
    pendentesRevisao: 0,
    semExtrato: 0,
    semVenda: 0,
  };

  function candidatosPorNsu(mov: MovimentacaoCaixa): TransacaoExtratoCartao[] {
    if (!mov.nsuMaquininha) return [];
    return Array.from(transacoesDisponiveis.values()).filter((t) => t.nsu === mov.nsuMaquininha);
  }

  function candidatosPorValorEData(mov: MovimentacaoCaixa): TransacaoExtratoCartao[] {
    const valorEsperado = valorComparacaoMovimentacao(mov);
    const modalidades = modalidadesCompativeis(mov.formaPagamento);
    const janelaMs = toleranciaDias * 24 * 60 * 60 * 1000;

    return Array.from(transacoesDisponiveis.values()).filter((t) => {
      const dentroDaJanela = Math.abs(t.dataVenda.getTime() - mov.createdAt.getTime()) <= janelaMs;
      const modalidadeOk = !t.modalidade || modalidades.includes(t.modalidade);
      return t.valorBruto.equals(valorEsperado) && dentroDaJanela && modalidadeOk;
    });
  }

  for (const mov of movimentacoes) {
    const valorEsperado = valorComparacaoMovimentacao(mov);

    // Nível 1: NSU/autorização + valor exato.
    const candidatosNsu = candidatosPorNsu(mov);
    if (candidatosNsu.length === 1) {
      const transacao = candidatosNsu[0];
      const diferenca = transacao.valorBruto.minus(valorEsperado);
      const divergente = !diferenca.isZero();

      await prisma.$transaction([
        prisma.conciliacaoCartao.create({
          data: {
            lojaId: input.lojaId,
            movimentacaoId: mov.id,
            transacaoExtratoId: transacao.id,
            statusMovimentacao: divergente ? "DIVERGENTE" : "CONCILIADO",
            statusTransacao: divergente ? "DIVERGENTE" : "CONCILIADO",
            nivelConfianca: 1,
            diferencaValor: divergente ? diferenca : null,
          },
        }),
        prisma.transacaoExtratoCartao.update({ where: { id: transacao.id }, data: { usadaEmConciliacao: true } }),
      ]);
      transacoesDisponiveis.delete(transacao.id);
      divergente ? resumo.divergentes++ : resumo.conciliadasNivel1++;
      continue;
    }
    if (candidatosNsu.length > 1) {
      await prisma.conciliacaoCartao.create({
        data: { lojaId: input.lojaId, movimentacaoId: mov.id, statusMovimentacao: "PENDENTE_REVISAO" },
      });
      resumo.pendentesRevisao++;
      continue;
    }

    // Nível 2: valor + data (tolerância) + modalidade compatível.
    const candidatosNivel2 = candidatosPorValorEData(mov);
    if (candidatosNivel2.length === 1) {
      const transacao = candidatosNivel2[0];
      await prisma.$transaction([
        prisma.conciliacaoCartao.create({
          data: {
            lojaId: input.lojaId,
            movimentacaoId: mov.id,
            transacaoExtratoId: transacao.id,
            statusMovimentacao: "CONCILIADO",
            statusTransacao: "CONCILIADO",
            nivelConfianca: 2,
          },
        }),
        prisma.transacaoExtratoCartao.update({ where: { id: transacao.id }, data: { usadaEmConciliacao: true } }),
      ]);
      transacoesDisponiveis.delete(transacao.id);
      resumo.conciliadasNivel2++;
      continue;
    }
    if (candidatosNivel2.length > 1) {
      await prisma.conciliacaoCartao.create({
        data: { lojaId: input.lojaId, movimentacaoId: mov.id, statusMovimentacao: "PENDENTE_REVISAO" },
      });
      resumo.pendentesRevisao++;
      continue;
    }

    // Nenhum candidato em nenhum nível.
    await prisma.conciliacaoCartao.create({
      data: { lojaId: input.lojaId, movimentacaoId: mov.id, statusMovimentacao: "SEM_EXTRATO" },
    });
    resumo.semExtrato++;
  }

  // Sobras do extrato: transações que nenhuma movimentação reivindicou. Não
  // há movimentação nesta linha, então `statusMovimentacao` fica no default
  // do schema (irrelevante aqui) — o que importa é `statusTransacao`.
  for (const transacao of transacoesDisponiveis.values()) {
    await prisma.conciliacaoCartao.create({
      data: {
        lojaId: input.lojaId,
        transacaoExtratoId: transacao.id,
        statusTransacao: "SEM_VENDA",
      },
    });
    resumo.semVenda++;
  }

  await auditoriaService.registrar({
    lojaId: input.lojaId,
    usuarioId: input.usuarioId,
    acao: "CONCILIACAO_EXECUTADA",
    entidade: "ConciliacaoCartao",
    detalhes: { ...resumo, periodo: { dataInicio: input.dataInicio, dataFim: input.dataFim } },
  });

  return resumo;
}
