import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { getNotificacaoAdapter } from "../modules/integracoes/integracoes.factory";
import { env } from "../config/env";

function inicioDoDiaNaTimezone(timezone: string): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const dia = partes.find((p) => p.type === "day")!.value;
  return new Date(`${ano}-${mes}-${dia}T00:00:00`);
}

/**
 * Roda uma vez por dia (23:55 no horário do servidor) e monta o resumo diário
 * por loja. Com NOTIFICACAO_PROVIDER=stub (padrão desta v1), o envio real de
 * e-mail/WhatsApp NÃO acontece — fica registrado como PENDENTE para não
 * mentir dizendo que o gestor recebeu algo que não foi enviado de verdade.
 */
export function registrarJobResumoDiario() {
  cron.schedule("55 23 * * *", async () => {
    try {
      const lojas = await prisma.loja.findMany({ where: { ativo: true }, include: { configuracao: true } });

      for (const loja of lojas) {
        const destinatarios = loja.configuracao?.emailsGestorResumoDiario ?? [];
        if (destinatarios.length === 0) continue;

        const inicioDoDia = inicioDoDiaNaTimezone(loja.timezone);
        const movimentacoes = await prisma.movimentacaoCaixa.findMany({
          where: { status: "ATIVA", turno: { lojaId: loja.id }, createdAt: { gte: inicioDoDia } },
        });
        const turnosFechadosHoje = await prisma.turnoCaixa.findMany({
          where: { lojaId: loja.id, status: "FECHADO", dataFechamento: { gte: inicioDoDia } },
          include: { fechamento: true },
        });

        const totalVendas = movimentacoes
          .filter((m) => m.tipo === "VENDA")
          .reduce((acc, m) => acc.plus(m.valor), new Prisma.Decimal(0));
        const totalSangrias = movimentacoes
          .filter((m) => m.tipo === "SANGRIA")
          .reduce((acc, m) => acc.plus(m.valor), new Prisma.Decimal(0));
        const totalSuprimentos = movimentacoes
          .filter((m) => m.tipo === "SUPRIMENTO")
          .reduce((acc, m) => acc.plus(m.valor), new Prisma.Decimal(0));
        const quantidadeCupons = movimentacoes.filter((m) => m.tipo === "VENDA").length;
        const ticketMedio = quantidadeCupons > 0 ? totalVendas.div(quantidadeCupons) : new Prisma.Decimal(0);
        const turnosComDivergencia = turnosFechadosHoje.filter(
          (t) => t.fechamento?.classificacaoGeral && t.fechamento.classificacaoGeral !== "EXATO"
        ).length;

        const resumo = {
          lojaNome: loja.nome,
          data: inicioDoDia.toISOString().slice(0, 10),
          totalVendas: totalVendas.toFixed(2),
          totalSangrias: totalSangrias.toFixed(2),
          totalSuprimentos: totalSuprimentos.toFixed(2),
          quantidadeCupons,
          ticketMedio: ticketMedio.toFixed(2),
          turnosComDivergencia,
        };

        const statusFinal = env.notificacaoProvider === "stub" ? "PENDENTE" : "ENVIADO";
        if (env.notificacaoProvider !== "stub") {
          const notificacao = getNotificacaoAdapter();
          await notificacao.enviarResumoDiario(destinatarios, resumo);
        }

        await prisma.notificacaoResumoDiario.upsert({
          where: { lojaId_data_canal: { lojaId: loja.id, data: inicioDoDia, canal: "EMAIL" } },
          create: {
            lojaId: loja.id,
            data: inicioDoDia,
            destinatarios,
            canal: "EMAIL",
            status: statusFinal,
            conteudoJson: resumo,
            tentativas: 1,
            ultimaTentativaEm: new Date(),
          },
          update: {
            status: statusFinal,
            conteudoJson: resumo,
            tentativas: { increment: 1 },
            ultimaTentativaEm: new Date(),
          },
        });
      }
    } catch (err) {
      logger.error("[job resumoDiario] erro inesperado", err);
    }
  });
}
