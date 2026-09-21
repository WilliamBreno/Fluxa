import { api } from "@/api/client";
import * as queue from "./queue";
import type { OperacaoFila } from "./types";

const TETO_ATRASO_MS = 60_000;
const POLLING_FALLBACK_MS = 15_000;

let iniciado = false;
let pausado = false;
let sincronizando = false;
let intervaloPolling: ReturnType<typeof setInterval> | null = null;
const ouvintes = new Set<() => void>();

function notificar() {
  ouvintes.forEach((cb) => cb());
}

export function aoMudar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

export function estaPausado(): boolean {
  return pausado;
}

export function pausar() {
  pausado = true;
  notificar();
}

export function retomar() {
  pausado = false;
  processarFila();
}

function erroDeRede(err: unknown): boolean {
  // Sem `response` = a requisição nunca chegou a ter uma resposta HTTP (timeout, sem conexão, DNS etc.)
  return !(err as { response?: unknown })?.response;
}

async function tentarEnviar(operacao: OperacaoFila): Promise<void> {
  try {
    await api.post(`/turnos/${operacao.turnoId}/movimentacoes`, {
      ...operacao.payload,
      chaveIdempotencia: operacao.id,
    });
    await queue.removerDaFila(operacao.id);
  } catch (err) {
    const status = (err as { response?: { status?: number; data?: { erro?: string } } })?.response?.status;

    if (status === 401) {
      // Sessão expirou no meio da fila — pausa sem perder nada; o AuthContext
      // chama retomar() de novo após um novo login bem-sucedido.
      pausar();
      return;
    }

    if (erroDeRede(err)) {
      // Falha de conexão de verdade: mantém na fila com backoff exponencial.
      const tentativas = operacao.tentativas + 1;
      const atraso = Math.min(TETO_ATRASO_MS, 1000 * 2 ** tentativas);
      await queue.atualizarTentativa(operacao.id, Date.now() + atraso, "Falha de conexão");
      return;
    }

    // Erro definitivo do servidor (403 permissão, 422 validação, 409 conflito
    // que não seja o replay idempotente, etc.) — nunca reenviado sozinho de
    // novo, fica visível para o gerente resolver.
    const motivo =
      (err as { response?: { data?: { erro?: string } } })?.response?.data?.erro ?? "Rejeitado pelo servidor.";
    await queue.moverParaRejeitadas(operacao, motivo);
  }
}

export async function processarFila(): Promise<void> {
  if (pausado || sincronizando) return;
  const pendentes = await queue.listarPendentes();
  if (pendentes.length === 0) return;

  sincronizando = true;
  notificar();
  try {
    const agora = Date.now();
    for (const operacao of pendentes) {
      if (operacao.proximaTentativaEm > agora) continue;
      await tentarEnviar(operacao);
    }
  } finally {
    sincronizando = false;
    notificar();
  }
}

export function estaSincronizando(): boolean {
  return sincronizando;
}

/** Chamar uma vez, no boot do app (ver OfflineProvider). */
export function iniciarSync() {
  if (iniciado) return;
  iniciado = true;

  window.addEventListener("online", () => {
    pausado = false;
    processarFila();
    notificar();
  });
  window.addEventListener("offline", notificar);
  window.addEventListener("focus", () => processarFila());

  intervaloPolling = setInterval(processarFila, POLLING_FALLBACK_MS);
  processarFila();
}

export function pararSync() {
  if (intervaloPolling) clearInterval(intervaloPolling);
  iniciado = false;
}
