import { api } from "./client";

export interface ConfiguracaoLoja {
  tetoGavetaDinheiro: string;
  toleranciaDivergencia: string;
  valorMinimoConferenciaCruzada: string;
  horaFechamentoAutomatico: string;
  fecharAutomaticamenteSemContagem: boolean;
  diasHistoricoMediaTroco: number;
  emailsGestorResumoDiario: string[];
}

export async function obterConfiguracao() {
  const { data } = await api.get<ConfiguracaoLoja>("/configuracoes");
  return data;
}

export async function atualizarConfiguracao(input: Partial<ConfiguracaoLoja>) {
  const { data } = await api.put<ConfiguracaoLoja>("/configuracoes", input);
  return data;
}
