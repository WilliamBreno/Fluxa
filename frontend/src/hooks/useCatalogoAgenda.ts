import { useEffect, useState } from "react";
import * as servicosApi from "@/api/servicos.api";
import * as agendamentosApi from "@/api/agendamentos.api";
import type { Servico } from "@/api/servicos.api";
import type { Profissional } from "@/api/agendamentos.api";

/** Serviços ativos e profissionais da loja — o que o formulário de agendamento precisa para abrir. */
export function useCatalogoAgenda() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  useEffect(() => {
    servicosApi.listarServicos().then(setServicos).catch(() => undefined);
    agendamentosApi.listarProfissionais().then(setProfissionais).catch(() => undefined);
  }, []);

  return { servicos, profissionais };
}
