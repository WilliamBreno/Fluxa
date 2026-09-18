import type { Prisma } from "@prisma/client";

/**
 * Gera o próximo número sequencial amigável (turno, relatório) sem gaps/corrida.
 * O upsert com increment compila para um único statement atômico (INSERT ...
 * ON CONFLICT DO UPDATE) — concorrência é resolvida pelo lock de linha do
 * próprio Postgres, então deve sempre ser chamado dentro de um $transaction.
 */
export async function proximoNumeroSequencial(
  tx: Prisma.TransactionClient,
  lojaId: string,
  chave: string
): Promise<number> {
  const contador = await tx.contador.upsert({
    where: { lojaId_chave: { lojaId, chave } },
    create: { lojaId, chave, valorAtual: 1 },
    update: { valorAtual: { increment: 1 } },
  });
  return contador.valorAtual;
}
