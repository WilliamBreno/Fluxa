import { api } from "./client";
import type { Plano } from "./planos.api";

export type StatusAssinatura = "TRIAL" | "ATIVA" | "INADIMPLENTE" | "CANCELADA";
export type CicloAssinatura = "MENSAL" | "ANUAL";

export interface Pagamento {
  id: string;
  ciclo: CicloAssinatura;
  valor: string;
  status: "PENDENTE" | "CONFIRMADO" | "FALHOU" | "CANCELADO";
  checkoutId: string | null;
  checkoutUrl: string | null;
  pagoEm: string | null;
  createdAt: string;
  plano: { nome: string };
}

export interface Assinatura {
  id: string;
  lojaId: string;
  planoId: string | null;
  plano: Plano | null;
  ciclo: CicloAssinatura | null;
  status: StatusAssinatura;
  trialFim: string;
  periodoAtualFim: string | null;
  pagamentos: Pagamento[];
}

export async function obterStatus() {
  const { data } = await api.get<Assinatura>("/assinatura");
  return data;
}

export async function iniciarCheckout(planoId: string, ciclo: CicloAssinatura) {
  const { data } = await api.post<{ checkoutUrl: string; checkoutId: string }>("/assinatura/checkout", {
    planoId,
    ciclo,
  });
  return data;
}

export async function simular(checkoutId: string, aprovado: boolean) {
  await api.post("/assinatura/simular", { checkoutId, aprovado });
}
