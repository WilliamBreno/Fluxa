import type { ResumoAgenda as Resumo } from "@/api/agendamentos.api";
import { formatarBRL } from "@/utils/formatMoney";

interface ResumoAgendaProps {
  resumo: Resumo | null;
  rotuloPeriodo: string;
}

export function ResumoAgenda({ resumo, rotuloPeriodo }: ResumoAgendaProps) {
  const s = resumo?.porStatus ?? {};
  const cancelados = s.CANCELADO ?? 0;
  const ativos = (resumo?.total ?? 0) - cancelados;
  const aConfirmar = s.AGENDADO ?? 0;

  const itens = [
    {
      rotulo: `Agendamentos ${rotuloPeriodo}`,
      valor: String(ativos),
      legenda: cancelados ? `${cancelados} cancelado${cancelados > 1 ? "s" : ""}` : "nenhum cancelado",
    },
    {
      rotulo: "A confirmar",
      valor: String(aConfirmar),
      legenda: `${s.CONFIRMADO ?? 0} confirmado${(s.CONFIRMADO ?? 0) === 1 ? "" : "s"}`,
    },
    {
      rotulo: "Concluídos",
      valor: String(s.CONCLUIDO ?? 0),
      legenda: s.EM_ATENDIMENTO ? `${s.EM_ATENDIMENTO} em atendimento agora` : "atendimentos finalizados",
    },
    {
      rotulo: "Faltas",
      valor: String(s.FALTOU ?? 0),
      legenda: `${(resumo?.taxaFaltas ?? 0).toLocaleString("pt-BR")}% de quem tinha horário`,
    },
    {
      rotulo: "Receita prevista",
      valor: formatarBRL(resumo?.receitaPrevista ?? 0),
      legenda: `${formatarBRL(resumo?.receitaRealizada ?? 0)} já realizado`,
    },
  ];

  return (
    <div className="fx-agenda-kpis" aria-busy={!resumo}>
      {itens.map((i) => (
        <div key={i.rotulo} className="fx-agenda-kpi">
          <span className="fx-overline">{i.rotulo}</span>
          <span className="fx-agenda-kpi__valor">{resumo ? i.valor : "—"}</span>
          <span className="fx-agenda-kpi__legenda">{resumo ? i.legenda : " "}</span>
        </div>
      ))}
    </div>
  );
}
