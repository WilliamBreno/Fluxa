import type { Agendamento } from "@/api/agendamentos.api";
import { Badge } from "@/components/ui/Badge";
import { formatarBRL } from "@/utils/formatMoney";
import {
  ROTULO_STATUS,
  capitalizar,
  VARIANTE_STATUS,
  duracaoMinutos,
  formatarDiaExtenso,
  formatarDuracao,
  formatarHora,
  formatarTelefone,
  inicioDoDia,
  mesmoDia,
} from "@/utils/agenda";

interface ListaAgendaProps {
  agendamentos: Agendamento[];
  onSelecionar: (ag: Agendamento) => void;
}

export function ListaAgenda({ agendamentos, onSelecionar }: ListaAgendaProps) {
  const porDia = new Map<number, Agendamento[]>();
  for (const ag of agendamentos) {
    const chave = +inicioDoDia(new Date(ag.inicio));
    porDia.set(chave, [...(porDia.get(chave) ?? []), ag]);
  }
  const hoje = new Date();

  return (
    <div>
      {[...porDia.entries()]
        .sort(([a], [b]) => a - b)
        .map(([chave, itens]) => {
          const dia = new Date(chave);
          return (
            <section key={chave} className="fx-lista-dia">
              <h3 className="fx-lista-dia__titulo">
                {mesmoDia(dia, hoje) ? "Hoje" : capitalizar(formatarDiaExtenso(dia))}
                <span style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
                  {mesmoDia(dia, hoje) && `${formatarDiaExtenso(dia)} · `}
                  {itens.length} {itens.length === 1 ? "agendamento" : "agendamentos"}
                </span>
              </h3>
              <div className="fx-card" style={{ padding: 0, overflow: "hidden" }}>
                {itens.map((ag) => (
                  <button key={ag.id} type="button" className="fx-lista-item" onClick={() => onSelecionar(ag)}>
                    <span className="fx-lista-item__hora">
                      {formatarHora(ag.inicio)}
                      <span className="fx-lista-item__sub" style={{ fontWeight: 400 }}>
                        {formatarDuracao(duracaoMinutos(ag.inicio, ag.fim))}
                      </span>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textDecoration: ag.status === "CANCELADO" ? "line-through" : undefined,
                        }}
                      >
                        {ag.cliente.nome}
                      </span>
                      <span className="fx-lista-item__sub">
                        {formatarTelefone(ag.cliente.telefone) || "Sem telefone"}
                        {ag.servico && <span className="fx-lista-item__servico-mobile"> · {ag.servico.nome}</span>}
                      </span>
                    </span>
                    <span className="fx-lista-item__servico" style={{ minWidth: 0 }}>
                      {ag.servico ? (
                        <span className="fx-chip-servico" style={{ ["--fx-evento-cor" as string]: ag.servico.cor }}>
                          <span>{ag.servico.nome}</span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--fx-text-tertiary)" }}>Sem serviço</span>
                      )}
                      {ag.valor !== null && <span className="fx-lista-item__sub">{formatarBRL(ag.valor)}</span>}
                    </span>
                    <span className="fx-lista-item__profissional" style={{ color: "var(--fx-text-secondary)", minWidth: 0 }}>
                      {ag.profissional?.nome ?? "A definir"}
                    </span>
                    <Badge variant={VARIANTE_STATUS[ag.status]}>{ROTULO_STATUS[ag.status]}</Badge>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
