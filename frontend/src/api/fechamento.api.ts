import { api } from "./client";
import type { FormaPagamento } from "./turnos.api";

export interface ContagemForma {
  formaPagamento: FormaPagamento;
  valorContado: string;
  valorEsperado: string | null;
  divergencia: string | null;
  classificacao: "EXATO" | "SOBRA" | "FALTA" | null;
}

export interface FechamentoCaixa {
  id: string;
  status: "CONTAGEM_PENDENTE" | "CONTAGEM_REALIZADA" | "CALCULADO" | "CONFIRMADO";
  divergenciaTotal: string | null;
  classificacaoGeral: "EXATO" | "SOBRA" | "FALTA" | null;
  causaDivergencia: string | null;
  contagens: ContagemForma[];
}

/** Passo 1: abre o procedimento de fechamento. Não retorna nenhum valor calculado. */
export async function iniciarFechamento(turnoId: string) {
  const { data } = await api.post<FechamentoCaixa>(`/turnos/${turnoId}/fechamento/iniciar`);
  return data;
}

/**
 * Passo 2 — CONTAGEM CEGA: envia o valor que o operador contou fisicamente.
 * A resposta já traz a divergência calculada (o servidor só calcula DEPOIS de
 * já ter persistido a contagem, de forma imutável) — é seguro exibir a partir
 * daqui, nunca antes deste POST responder.
 */
export async function registrarContagemCega(
  turnoId: string,
  contagens: { formaPagamento: FormaPagamento; valorContado: number }[]
) {
  const { data } = await api.post<FechamentoCaixa>(`/turnos/${turnoId}/fechamento/contagem`, { contagens });
  return data;
}

/** Passo 3 (opcional, para recarregar a tela): idempotente, só funciona depois da contagem já registrada. */
export async function obterDivergencia(turnoId: string) {
  const { data } = await api.get<FechamentoCaixa>(`/turnos/${turnoId}/fechamento/divergencia`);
  return data;
}

/** Passo 4 — Redução Z: confirma e trava o turno definitivamente. */
export async function confirmarFechamento(
  turnoId: string,
  input: { causaDivergencia?: string; gerarAjusteAutomatico: boolean; observacoesFechamento?: string }
) {
  const { data } = await api.post(`/turnos/${turnoId}/fechamento/confirmar`, input);
  return data;
}
