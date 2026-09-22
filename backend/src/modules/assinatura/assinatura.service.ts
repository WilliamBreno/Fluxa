import { Prisma, type CicloAssinatura } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import * as notificacoesService from "../notificacoes/notificacoes.service";
import { getPagamentoAdapter } from "../integracoes/integracoes.factory";

const DIAS_POR_CICLO: Record<CicloAssinatura, number> = { MENSAL: 30, ANUAL: 365 };

export async function obterStatus(lojaId: string) {
  const assinatura = await prisma.assinatura.findUnique({
    where: { lojaId },
    include: {
      plano: true,
      pagamentos: { orderBy: { createdAt: "desc" }, take: 5, include: { plano: { select: { nome: true } } } },
    },
  });
  if (!assinatura) throw new AppError("Assinatura não encontrada para esta loja.", 404);
  return assinatura;
}

export async function iniciarCheckout(lojaId: string, input: { planoId: string; ciclo: CicloAssinatura }) {
  const plano = await prisma.plano.findUnique({ where: { id: input.planoId } });
  if (!plano || !plano.ativo) throw new AppError("Plano não encontrado ou indisponível.", 404);

  const assinatura = await prisma.assinatura.upsert({
    where: { lojaId },
    create: { lojaId, planoId: plano.id, ciclo: input.ciclo, trialFim: new Date() },
    update: { planoId: plano.id, ciclo: input.ciclo },
  });

  const valor = input.ciclo === "MENSAL" ? plano.valorMensal : plano.valorAnual;

  const pagamento = await prisma.pagamento.create({
    data: {
      assinaturaId: assinatura.id,
      planoId: plano.id,
      ciclo: input.ciclo,
      valor,
      status: "PENDENTE",
    },
  });

  const adapter = getPagamentoAdapter();
  const checkout = await adapter.criarCheckout({
    referencia: pagamento.id,
    descricao: `Fluxa — plano ${plano.nome} (${input.ciclo === "MENSAL" ? "mensal" : "anual"})`,
    valor: Number(valor),
    retornoUrl: `${env.appPublicUrl}/assinatura/confirmado`,
  });

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { checkoutId: checkout.checkoutId, checkoutUrl: checkout.checkoutUrl },
  });

  await auditoriaService.registrar({
    lojaId,
    acao: "ASSINATURA_ATUALIZADA",
    entidade: "Assinatura",
    entidadeId: assinatura.id,
    detalhes: { planoId: plano.id, ciclo: input.ciclo, pagamentoId: pagamento.id },
  });

  return { checkoutUrl: checkout.checkoutUrl, checkoutId: checkout.checkoutId };
}

async function aplicarResultadoPagamento(checkoutId: string, status: "CONFIRMADO" | "FALHOU", payload?: unknown) {
  const pagamento = await prisma.pagamento.findUnique({ where: { checkoutId }, include: { assinatura: true } });
  if (!pagamento) return;
  if (pagamento.status !== "PENDENTE") return; // já processado — webhook pode reenviar

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status, pagoEm: status === "CONFIRMADO" ? new Date() : undefined, payloadWebhook: payload as Prisma.InputJsonValue },
  });

  if (status === "CONFIRMADO") {
    const periodoAtualFim = new Date(Date.now() + DIAS_POR_CICLO[pagamento.ciclo] * 24 * 60 * 60 * 1000);
    await prisma.assinatura.update({
      where: { id: pagamento.assinaturaId },
      data: { status: "ATIVA", periodoAtualFim },
    });
    await auditoriaService.registrar({
      lojaId: pagamento.assinatura.lojaId,
      acao: "ASSINATURA_PAGAMENTO_CONFIRMADO",
      entidade: "Pagamento",
      entidadeId: pagamento.id,
    });
    await notificacoesService.criar({
      lojaId: pagamento.assinatura.lojaId,
      tipo: "ASSINATURA_PAGAMENTO_CONFIRMADO",
      severidade: "INFO",
      titulo: "Pagamento confirmado",
      mensagem: "Sua assinatura foi renovada com sucesso.",
      entidade: "Pagamento",
      entidadeId: pagamento.id,
    });
  } else {
    await auditoriaService.registrar({
      lojaId: pagamento.assinatura.lojaId,
      acao: "ASSINATURA_PAGAMENTO_FALHOU",
      entidade: "Pagamento",
      entidadeId: pagamento.id,
    });
    await notificacoesService.criar({
      lojaId: pagamento.assinatura.lojaId,
      tipo: "ASSINATURA_PAGAMENTO_FALHOU",
      severidade: "URGENTE",
      titulo: "Pagamento não aprovado",
      mensagem: "O pagamento da sua assinatura não foi aprovado. Tente novamente para não perder o acesso.",
      entidade: "Pagamento",
      entidadeId: pagamento.id,
    });
  }
}

export async function processarWebhook(payload: unknown, headers: Record<string, string | string[] | undefined>) {
  const adapter = getPagamentoAdapter();
  const resultado = await adapter.verificarWebhook(payload, headers);
  if (!resultado.valido || !resultado.checkoutId || !resultado.status) {
    throw new AppError("Webhook inválido.", 400);
  }
  await aplicarResultadoPagamento(resultado.checkoutId, resultado.status, payload);
}

/** Só funciona quando PAGAMENTO_PROVIDER=stub — dá pra testar o fluxo sem provedor real. */
export async function simularAprovacao(checkoutId: string, aprovado: boolean) {
  if (env.pagamentoProvider !== "stub") {
    throw new AppError("Simulação de pagamento só está disponível em modo stub.", 403);
  }
  await aplicarResultadoPagamento(checkoutId, aprovado ? "CONFIRMADO" : "FALHOU", { simulado: true });
}
