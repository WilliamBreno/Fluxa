import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitirParaLoja } from "../lib/socket";
import { SOCKET_EVENTS } from "../sockets/events";
import { logger } from "../lib/logger";
import * as auditoriaService from "../modules/auditoria/auditoria.service";
import { getNotificacaoAdapter } from "../modules/integracoes/integracoes.factory";
import { calcularResumoSaldoTurno, TODAS_FORMAS_PAGAMENTO } from "../modules/turnos/saldoCaixa.util";
import { proximoNumeroSequencial } from "../utils/contador.util";
import { sha256Json } from "../utils/hash";

function horaAtualNaTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * A cada minuto, verifica se algum caixa continua aberto após o horário de
 * fechamento automático configurado por loja. Por padrão SÓ ALERTA — nunca
 * fecha sozinho, porque a contagem cega exige contagem física humana. Só
 * força o fechamento (usando o próprio valor esperado como "contagem") se a
 * loja tiver optado explicitamente por `fecharAutomaticamenteSemContagem`.
 */
export function registrarJobFechamentoAutomatico() {
  cron.schedule("* * * * *", async () => {
    try {
      const lojas = await prisma.loja.findMany({ where: { ativo: true }, include: { configuracao: true } });

      for (const loja of lojas) {
        const horaAlvo = loja.configuracao?.horaFechamentoAutomatico ?? "23:59";
        if (horaAtualNaTimezone(loja.timezone) !== horaAlvo) continue;

        const turnosAbertos = await prisma.turnoCaixa.findMany({
          where: { lojaId: loja.id, status: "ABERTO" },
          include: { terminal: true },
        });
        if (turnosAbertos.length === 0) continue;

        for (const turno of turnosAbertos) {
          await auditoriaService.registrar({
            lojaId: loja.id,
            acao: "FECHAMENTO_AUTOMATICO_ALERTA",
            entidade: "TurnoCaixa",
            entidadeId: turno.id,
            detalhes: { terminal: turno.terminal.nome, horaAlvo },
          });
          emitirParaLoja(loja.id, SOCKET_EVENTS.ALERTA_FECHAMENTO_NAO_REALIZADO, {
            turnoId: turno.id,
            terminalNome: turno.terminal.nome,
          });

          if (loja.configuracao?.fecharAutomaticamenteSemContagem) {
            await forcarFechamentoSemContagem(turno.id, loja.id);
          }
        }

        if (loja.configuracao?.emailsGestorResumoDiario?.length) {
          const notificacao = getNotificacaoAdapter();
          await notificacao.enviarAlerta(
            loja.configuracao.emailsGestorResumoDiario,
            `${turnosAbertos.length} caixa(s) da loja ${loja.nome} não foram fechados até ${horaAlvo}.`
          );
        }
      }
    } catch (err) {
      logger.error("[job fechamentoAutomatico] erro inesperado", err);
    }
  });
}

async function forcarFechamentoSemContagem(turnoId: string, lojaId: string) {
  await prisma.$transaction(async (tx) => {
    const resumo = await calcularResumoSaldoTurno(turnoId, tx);

    let fechamento = await tx.fechamentoCaixa.findUnique({ where: { turnoId } });
    if (!fechamento) {
      fechamento = await tx.fechamentoCaixa.create({ data: { turnoId, status: "CONTAGEM_PENDENTE" } });
    }
    if (fechamento.status === "CONFIRMADO") return;

    // Sem contagem física real: usa o próprio valor esperado como "contado",
    // e o relatório deixa isso explícito para não mentir sobre ter havido conferência.
    for (const forma of TODAS_FORMAS_PAGAMENTO) {
      const valor = resumo.saldoPorForma[forma];
      await tx.fechamentoContagemForma.upsert({
        where: { fechamentoId_formaPagamento: { fechamentoId: fechamento.id, formaPagamento: forma } },
        create: {
          fechamentoId: fechamento.id,
          formaPagamento: forma,
          valorContado: valor,
          valorEsperado: valor,
          divergencia: new Prisma.Decimal(0),
          classificacao: "EXATO",
          calculadoEm: new Date(),
        },
        update: {
          valorContado: valor,
          valorEsperado: valor,
          divergencia: new Prisma.Decimal(0),
          classificacao: "EXATO",
          calculadoEm: new Date(),
        },
      });
    }

    const causa =
      "Fechado automaticamente pelo sistema por ausência de fechamento manual — nenhuma contagem física foi realizada.";

    await tx.fechamentoCaixa.update({
      where: { id: fechamento.id },
      data: {
        status: "CONFIRMADO",
        divergenciaTotal: new Prisma.Decimal(0),
        classificacaoGeral: "EXATO",
        causaDivergencia: causa,
        confirmadoEm: new Date(),
      },
    });

    const turno = await tx.turnoCaixa.update({
      where: { id: turnoId },
      data: { status: "FECHADO", dataFechamento: new Date(), fechamentoAutomatico: true },
      include: { terminal: true },
    });

    const numeroSequencial = await proximoNumeroSequencial(tx, lojaId, "relatorio");
    const conteudoJson = {
      turnoId,
      terminal: { id: turno.terminal.id, nome: turno.terminal.nome, codigo: turno.terminal.codigo },
      numeroSequencialTurno: turno.numeroSequencial,
      periodo: turno.periodo,
      dataAbertura: turno.dataAbertura,
      dataFechamento: turno.dataFechamento,
      fundoTrocoInformado: turno.fundoTrocoInformado.toFixed(2),
      totalVendasPorForma: Object.fromEntries(
        TODAS_FORMAS_PAGAMENTO.map((f) => [f, resumo.totalVendasPorForma[f].toFixed(2)])
      ),
      totalVendas: resumo.totalVendas.toFixed(2),
      totalSangrias: resumo.totalSangrias.toFixed(2),
      totalSuprimentos: resumo.totalSuprimentos.toFixed(2),
      quantidadeCupons: resumo.quantidadeCupons,
      ticketMedio: resumo.ticketMedio.toFixed(2),
      contagens: TODAS_FORMAS_PAGAMENTO.map((forma) => ({
        formaPagamento: forma,
        valorContado: resumo.saldoPorForma[forma].toFixed(2),
        valorEsperado: resumo.saldoPorForma[forma].toFixed(2),
        divergencia: "0.00",
        classificacao: "EXATO",
      })),
      divergenciaTotal: "0.00",
      classificacaoGeral: "EXATO",
      causaDivergencia: causa,
      ajusteAutomaticoGerado: false,
      fechadoAutomaticamenteSemContagem: true,
    };

    await tx.relatorioFechamento.create({
      data: {
        turnoId,
        lojaId,
        numeroSequencial,
        conteudoJson,
        hashIntegridade: sha256Json(conteudoJson),
      },
    });
  });

  await auditoriaService.registrar({
    lojaId,
    acao: "FECHAMENTO_AUTOMATICO_FORCADO",
    entidade: "TurnoCaixa",
    entidadeId: turnoId,
  });
  emitirParaLoja(lojaId, SOCKET_EVENTS.TURNO_FECHADO, { turnoId, forcado: true });
}
