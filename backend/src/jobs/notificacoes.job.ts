import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import * as notificacoesService from "../modules/notificacoes/notificacoes.service";
import * as relatoriosService from "../modules/relatorios/relatorios.service";

const HORAS_AVISO_TURNO_ABERTO = 10;

/**
 * Notificações que dependem de acumular/verificar estado ao longo do tempo
 * (diferente das notificações orientadas a evento, criadas inline em
 * fechamento.service.ts/movimentacoes.service.ts/assinatura.service.ts no
 * exato momento em que o fato acontece).
 */
export function registrarJobNotificacoes() {
  cron.schedule("*/10 * * * *", async () => {
    try {
      await avisarTurnosAbertosDemais();
      await avisarConciliacoesPendentes();
      await avisarTrialExpirando();
      await avisarDivergenciaRecorrente();
    } catch (err) {
      logger.error("[job notificacoes] erro inesperado", err);
    }
  });
}

/** Aviso antecipado — diferente do alerta em cima da hora que fechamentoAutomatico.job.ts já dispara. */
async function avisarTurnosAbertosDemais() {
  const limite = new Date(Date.now() - HORAS_AVISO_TURNO_ABERTO * 60 * 60 * 1000);
  const turnos = await prisma.turnoCaixa.findMany({
    where: { status: "ABERTO", dataAbertura: { lte: limite } },
    include: { terminal: true },
  });

  for (const turno of turnos) {
    await notificacoesService.criar({
      lojaId: turno.lojaId,
      tipo: "TURNO_ABERTO_HORAS_DEMAIS",
      severidade: "ATENCAO",
      titulo: "Caixa aberto há muito tempo",
      mensagem: `O terminal ${turno.terminal.nome} está aberto há mais de ${HORAS_AVISO_TURNO_ABERTO} horas. Não esqueça de fazer o fechamento.`,
      entidade: "TurnoCaixa",
      entidadeId: `${turno.id}:aviso`,
    });
  }
}

async function avisarConciliacoesPendentes() {
  const pendentesPorLoja = await prisma.conciliacaoCartao.groupBy({
    by: ["lojaId"],
    where: { statusMovimentacao: "PENDENTE_REVISAO" },
    _count: { _all: true },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  for (const grupo of pendentesPorLoja) {
    if (grupo._count._all === 0) continue;
    await notificacoesService.criar({
      lojaId: grupo.lojaId,
      tipo: "CONCILIACAO_PENDENTE_REVISAO",
      severidade: "ATENCAO",
      titulo: "Conciliação de cartões pendente de revisão",
      mensagem: `${grupo._count._all} transação(ões) de cartão aguardando revisão manual na conciliação.`,
      entidade: "ConciliacaoCartao",
      entidadeId: `pendencias:${hoje}`,
    });
  }
}

async function avisarTrialExpirando() {
  const agora = new Date();
  const emUmDia = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  const assinaturas = await prisma.assinatura.findMany({
    where: { status: "TRIAL", trialFim: { lte: emUmDia, gte: agora } },
  });

  for (const assinatura of assinaturas) {
    await notificacoesService.criar({
      lojaId: assinatura.lojaId,
      tipo: "ASSINATURA_TRIAL_EXPIRANDO",
      severidade: "URGENTE",
      titulo: "Seu teste grátis está acabando",
      mensagem: "Seu período de teste termina em menos de 24 horas. Escolha um plano para não perder o acesso ao sistema.",
      entidade: "Assinatura",
      entidadeId: assinatura.id,
    });
  }
}

/** Reaproveita a detecção que já existe em relatoriosService — antes só consultada sob demanda pelo relatório. */
async function avisarDivergenciaRecorrente() {
  const lojas = await prisma.loja.findMany({ where: { ativo: true }, select: { id: true } });
  const mesAtual = new Date().toISOString().slice(0, 7);

  for (const loja of lojas) {
    const alertas = await relatoriosService.alertasDivergenciaRecorrente(loja.id);
    for (const alerta of alertas) {
      await notificacoesService.criar({
        lojaId: loja.id,
        tipo: "DIVERGENCIA_RECORRENTE",
        severidade: "ATENCAO",
        titulo: "Padrão de divergência recorrente",
        mensagem: `${alerta.operadorNome} teve ${alerta.ocorrencias} fechamentos com divergência nos últimos 60 dias (acumulado: R$ ${alerta.divergenciaAcumulada}).`,
        entidade: "Usuario",
        entidadeId: `${alerta.operadorId}:${mesAtual}`,
      });
    }
  }
}
