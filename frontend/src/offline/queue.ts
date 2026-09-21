import * as db from "./db";
import type { OperacaoFila, OperacaoRejeitada, PayloadMovimentacao } from "./types";

export async function enfileirarOperacao(input: { id: string; turnoId: string; payload: PayloadMovimentacao }): Promise<OperacaoFila> {
  const operacao: OperacaoFila = {
    ...input,
    criadaEm: Date.now(),
    tentativas: 0,
    proximaTentativaEm: Date.now(),
  };
  await db.put(db.STORE_FILA, operacao);
  return operacao;
}

export function listarPendentes(): Promise<OperacaoFila[]> {
  return db.listarTudo<OperacaoFila>(db.STORE_FILA);
}

export function removerDaFila(id: string): Promise<void> {
  return db.remover(db.STORE_FILA, id);
}

export async function atualizarTentativa(id: string, proximaTentativaEm: number, ultimoErro: string): Promise<void> {
  const atual = await db.obter<OperacaoFila>(db.STORE_FILA, id);
  if (!atual) return;
  await db.put(db.STORE_FILA, { ...atual, tentativas: atual.tentativas + 1, proximaTentativaEm, ultimoErro });
}

export async function moverParaRejeitadas(operacao: OperacaoFila, motivoRejeicao: string): Promise<void> {
  const rejeitada: OperacaoRejeitada = { ...operacao, motivoRejeicao, rejeitadaEm: Date.now() };
  await db.put(db.STORE_REJEITADAS, rejeitada);
  await db.remover(db.STORE_FILA, operacao.id);
}

export function listarRejeitadas(): Promise<OperacaoRejeitada[]> {
  return db.listarTudo<OperacaoRejeitada>(db.STORE_REJEITADAS);
}

export function removerRejeitada(id: string): Promise<void> {
  return db.remover(db.STORE_REJEITADAS, id);
}
