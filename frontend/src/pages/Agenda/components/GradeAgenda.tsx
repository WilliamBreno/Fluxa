import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { CheckCheck, CircleCheck, UserX } from "lucide-react";
import type { Agendamento } from "@/api/agendamentos.api";
import { ROTULO_STATUS, STATUS_INATIVOS, formatarHora, mesmoDia } from "@/utils/agenda";

const HORA_PX = 64;
const PASSO_MINUTOS = 15;
const HORA_INICIO_PADRAO = 7;
const HORA_FIM_PADRAO = 21;
const LARGURA_MIN_COLUNA = 150;

export interface ColunaGrade {
  id: string;
  dia: Date;
  /** Profissional pré-selecionado ao clicar num horário vazio desta coluna. */
  profissionalId?: string | null;
  cabecalho: React.ReactNode;
  hoje?: boolean;
  pertence: (ag: Agendamento) => boolean;
}

interface GradeAgendaProps {
  colunas: ColunaGrade[];
  agendamentos: Agendamento[];
  onSelecionar: (ag: Agendamento) => void;
  onCriarEm: (inicio: Date, profissionalId?: string | null) => void;
}

interface Posicionado {
  ag: Agendamento;
  top: number;
  altura: number;
  faixa: number;
  totalFaixas: number;
}

/**
 * Distribui agendamentos que se sobrepõem lado a lado. Agrupa em "blocos"
 * de sobreposição contínua e, dentro de cada bloco, põe cada item na
 * primeira faixa livre — mesma ideia das agendas do Google/Outlook.
 */
function posicionar(itens: Agendamento[], dia: Date, horaInicio: number): Posicionado[] {
  const inicioGrade = new Date(dia);
  inicioGrade.setHours(horaInicio, 0, 0, 0);
  const fimDia = new Date(dia);
  fimDia.setHours(24, 0, 0, 0);

  const ordenados = [...itens].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio) || +new Date(b.fim) - +new Date(a.fim));
  const resultado: Posicionado[] = [];
  let bloco: { pos: Posicionado; fim: number }[] = [];
  let fimBloco = -Infinity;

  const fecharBloco = () => {
    const total = Math.max(1, ...bloco.map((b) => b.pos.faixa + 1));
    for (const b of bloco) b.pos.totalFaixas = total;
    bloco = [];
  };

  for (const ag of ordenados) {
    const ini = Math.max(+new Date(ag.inicio), +inicioGrade);
    const fim = Math.min(+new Date(ag.fim), +fimDia);
    if (ini >= fimBloco) fecharBloco();

    const ocupadas = new Set(bloco.filter((b) => b.fim > ini).map((b) => b.pos.faixa));
    let faixa = 0;
    while (ocupadas.has(faixa)) faixa++;

    const pos: Posicionado = {
      ag,
      top: ((ini - +inicioGrade) / 3_600_000) * HORA_PX,
      altura: Math.max(((fim - ini) / 3_600_000) * HORA_PX, 22),
      faixa,
      totalFaixas: 1,
    };
    bloco.push({ pos, fim });
    resultado.push(pos);
    fimBloco = Math.max(fimBloco, fim);
  }
  fecharBloco();
  return resultado;
}

function IconeStatus({ ag }: { ag: Agendamento }) {
  if (ag.status === "CONFIRMADO") return <CircleCheck size={12} aria-hidden style={{ flexShrink: 0, color: "var(--fx-chart-1)" }} />;
  if (ag.status === "CONCLUIDO") return <CheckCheck size={12} aria-hidden style={{ flexShrink: 0, color: "var(--fx-color-success)" }} />;
  if (ag.status === "FALTOU") return <UserX size={12} aria-hidden style={{ flexShrink: 0, color: "var(--fx-color-danger)" }} />;
  return null;
}

export function GradeAgenda({ colunas, agendamentos, onSelecionar, onCriarEm }: GradeAgendaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [hover, setHover] = useState<{ coluna: string; minutos: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Expande a faixa de horas se houver atendimento fora do horário comercial padrão.
  const { horaInicio, horaFim } = useMemo(() => {
    let ini = HORA_INICIO_PADRAO;
    let fim = HORA_FIM_PADRAO;
    for (const ag of agendamentos) {
      const i = new Date(ag.inicio);
      const f = new Date(ag.fim);
      ini = Math.min(ini, i.getHours());
      fim = Math.max(fim, mesmoDia(i, f) ? Math.ceil(f.getHours() + f.getMinutes() / 60) : 24);
    }
    return { horaInicio: ini, horaFim: Math.min(fim, 24) };
  }, [agendamentos]);

  const horas = Array.from({ length: horaFim - horaInicio }, (_, i) => horaInicio + i);
  const alturaTotal = horas.length * HORA_PX;
  const chaveColunas = colunas.map((c) => c.id).join("|");

  // Ao trocar de dia/semana, rola para perto de agora (se hoje está na tela) ou para o primeiro atendimento.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const horaAgora = new Date().getHours();
    const agoraNaGrade = colunas.some((c) => mesmoDia(c.dia, new Date())) && horaAgora >= horaInicio && horaAgora < horaFim;
    const primeiro = agendamentos.length ? Math.min(...agendamentos.map((a) => new Date(a.inicio).getHours())) : 8;
    const horaAlvo = agoraNaGrade ? horaAgora - 1 : primeiro - 0.5;
    el.scrollTop = Math.max(0, (horaAlvo - horaInicio) * HORA_PX);
    // A última dependência refaz a rolagem quando os dados chegam depois da grade montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveColunas, horaInicio, agendamentos.length > 0]);

  function minutosDoEvento(e: MouseEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutos = Math.floor(((y / HORA_PX) * 60) / PASSO_MINUTOS) * PASSO_MINUTOS;
    return Math.max(0, Math.min(minutos, (horaFim - horaInicio) * 60 - PASSO_MINUTOS));
  }

  function rotuloMinutos(minutos: number) {
    const total = horaInicio * 60 + minutos;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  const template = `var(--fx-gutter) repeat(${colunas.length}, minmax(${LARGURA_MIN_COLUNA}px, 1fr))`;

  return (
    <div className="fx-grade">
      <div className="fx-grade__scroll fx-scroll" ref={scrollRef}>
        <div style={{ minWidth: `calc(var(--fx-gutter) + ${colunas.length * LARGURA_MIN_COLUNA}px)` }}>
          <div className="fx-grade__cabecalho" style={{ gridTemplateColumns: template }}>
            <div />
            {colunas.map((c) => (
              <div key={c.id} className={`fx-grade__cabecalho-celula ${c.hoje ? "fx-grade__cabecalho-celula--hoje" : ""}`}>
                {c.cabecalho}
              </div>
            ))}
          </div>

          <div className="fx-grade__corpo" style={{ gridTemplateColumns: template, height: alturaTotal }}>
            <div className="fx-grade__horas" aria-hidden>
              {horas.map((h) => (
                <div key={h} className="fx-grade__hora">
                  {h === horaInicio ? "" : `${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>

            {colunas.map((coluna) => {
              const itens = agendamentos.filter(coluna.pertence);
              const posicionados = posicionar(itens, coluna.dia, horaInicio);
              const mostrarAgora = mesmoDia(coluna.dia, agora) && agora.getHours() >= horaInicio && agora.getHours() < horaFim;
              const topAgora = ((agora.getHours() - horaInicio) * 60 + agora.getMinutes()) * (HORA_PX / 60);

              return (
                <div
                  key={coluna.id}
                  className={`fx-grade__coluna ${coluna.hoje ? "fx-grade__coluna--hoje" : ""}`}
                  onMouseMove={(e) => {
                    if (e.target !== e.currentTarget) return setHover(null);
                    setHover({ coluna: coluna.id, minutos: minutosDoEvento(e) });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const inicio = new Date(coluna.dia);
                    inicio.setHours(horaInicio, minutosDoEvento(e), 0, 0);
                    onCriarEm(inicio, coluna.profissionalId);
                  }}
                >
                  {hover?.coluna === coluna.id && (
                    <div className="fx-grade__hover" style={{ top: (hover.minutos / 60) * HORA_PX }}>
                      + {rotuloMinutos(hover.minutos)}
                    </div>
                  )}

                  {mostrarAgora && <div className="fx-grade__agora" style={{ top: topAgora }} aria-label="Agora" />}

                  {posicionados.map(({ ag, top, altura, faixa, totalFaixas }) => {
                    const inativo = STATUS_INATIVOS.includes(ag.status);
                    const compacto = altura < 40;
                    const largura = 100 / totalFaixas;
                    const estilo: CSSProperties & Record<string, string | number> = {
                      top: top + 1,
                      height: altura - 2,
                      left: `calc(${faixa * largura}% + 3px)`,
                      width: `calc(${largura}% - 6px)`,
                      "--fx-evento-cor": ag.servico?.cor ?? "var(--fx-text-tertiary)",
                    };
                    const classes = [
                      "fx-evento",
                      compacto ? "fx-evento--compacto" : "",
                      inativo ? "fx-evento--inativo" : "",
                      ag.status === "CONCLUIDO" ? "fx-evento--concluido" : "",
                      ag.status === "EM_ATENDIMENTO" ? "fx-evento--atendendo" : "",
                    ].join(" ");

                    return (
                      <button
                        key={ag.id}
                        type="button"
                        className={classes}
                        style={estilo}
                        onClick={() => onSelecionar(ag)}
                        aria-label={`${formatarHora(ag.inicio)} ${ag.cliente.nome}, ${ag.servico?.nome ?? "sem serviço"}, ${ROTULO_STATUS[ag.status]}`}
                      >
                        <span className="fx-evento__titulo">
                          <IconeStatus ag={ag} />
                          <span>{ag.cliente.nome}</span>
                        </span>
                        <span className="fx-evento__meta">
                          {formatarHora(ag.inicio)}
                          {!compacto && `–${formatarHora(ag.fim)}`}
                          {ag.servico && ` · ${ag.servico.nome}`}
                        </span>
                        {altura >= 72 && ag.status === "EM_ATENDIMENTO" && (
                          <span className="fx-evento__meta" style={{ fontWeight: 600, color: "var(--fx-color-warning)" }}>
                            Em atendimento
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
