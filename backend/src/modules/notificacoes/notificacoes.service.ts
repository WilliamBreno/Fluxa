import { Prisma, type Notificacao, type SeveridadeNotificacao, type TipoNotificacao } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { emitirParaLoja } from "../../lib/socket";
import { SOCKET_EVENTS } from "../../sockets/events";

interface CriarNotificacaoInput {
  lojaId: string;
  usuarioId?: string;
  tipo: TipoNotificacao;
  severidade?: SeveridadeNotificacao;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId: string;
}

/**
 * Cria uma notificação, deduplicando por (lojaId, tipo, entidadeId) — a
 * mesma técnica de idempotência do `chaveIdempotencia` em movimentações:
 * tenta criar, e se já existe (P2002) simplesmente não recria nem reemite.
 * Isso permite chamar de um cron a cada N minutos sem gerar spam repetido
 * da mesma ocorrência.
 */
export async function criar(input: CriarNotificacaoInput): Promise<Notificacao | null> {
  try {
    const notificacao = await prisma.notificacao.create({
      data: {
        lojaId: input.lojaId,
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        severidade: input.severidade ?? "INFO",
        titulo: input.titulo,
        mensagem: input.mensagem,
        entidade: input.entidade,
        entidadeId: input.entidadeId,
      },
    });
    emitirParaLoja(input.lojaId, SOCKET_EVENTS.NOTIFICACAO_NOVA, notificacao);
    return notificacao;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return null;
    }
    throw err;
  }
}

export async function listar(lojaId: string, opts: { apenasNaoLidas?: boolean } = {}) {
  return prisma.notificacao.findMany({
    where: {
      lojaId,
      ...(opts.apenasNaoLidas ? { lidaEm: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function marcarComoLida(id: string, lojaId: string) {
  await prisma.notificacao.updateMany({
    where: { id, lojaId },
    data: { lidaEm: new Date() },
  });
}

export async function marcarTodasComoLidas(lojaId: string) {
  await prisma.notificacao.updateMany({
    where: { lojaId, lidaEm: null },
    data: { lidaEm: new Date() },
  });
}
