import * as db from "./db";

interface EntradaCache<T> {
  chave: string;
  valor: T;
  atualizadoEm: number;
}

/** Cache local de leitura (turno atual, saldo/resumo) para funcionar offline — nunca usado para escrita. */
export async function salvarCache<T>(chave: string, valor: T): Promise<void> {
  await db.put<EntradaCache<T>>(db.STORE_CACHE, { chave, valor, atualizadoEm: Date.now() });
}

export async function lerCache<T>(chave: string): Promise<{ valor: T; atualizadoEm: number } | null> {
  const entrada = await db.obter<EntradaCache<T>>(db.STORE_CACHE, chave);
  if (!entrada) return null;
  return { valor: entrada.valor, atualizadoEm: entrada.atualizadoEm };
}
