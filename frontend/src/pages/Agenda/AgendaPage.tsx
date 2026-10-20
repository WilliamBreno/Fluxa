import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { ModalAgendamento, type PreenchimentoAgendamento } from "@/components/agenda/ModalAgendamento";
import { PainelAgendamento } from "@/components/agenda/PainelAgendamento";
import { useCatalogoAgenda } from "@/hooks/useCatalogoAgenda";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import * as agendamentosApi from "@/api/agendamentos.api";
import type { Agendamento, ResumoAgenda as Resumo } from "@/api/agendamentos.api";
import {
  capitalizar,
  inicioDaSemana,
  inicioDoDia,
  iniciais,
  mesmoDia,
  paraInputData,
  somarDias,
} from "@/utils/agenda";
import { GradeAgenda, type ColunaGrade } from "./components/GradeAgenda";
import { ListaAgenda } from "./components/ListaAgenda";
import { ResumoAgenda } from "./components/ResumoAgenda";

type Visao = "dia" | "semana" | "lista";

const SEM_PROFISSIONAL = "__sem__";

function visaoInicial(): Visao {
  try {
    const salva = localStorage.getItem("fluxa_agenda_visao") as Visao | null;
    if (salva === "dia" || salva === "semana" || salva === "lista") return salva;
  } catch {
    /* storage bloqueado */
  }
  return window.matchMedia("(max-width: 640px)").matches ? "lista" : "dia";
}

function dataDoParametro(valor: string | null): Date {
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  return inicioDoDia(new Date());
}

/** "19 – 25 de out." no mesmo mês; ano só aparece quando não é o corrente (cabe no mobile). */
function tituloIntervalo(a: Date, b: Date): string {
  const anoAtual = new Date().getFullYear();
  const mes = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short" });
  const ano = b.getFullYear() !== anoAtual ? ` de ${b.getFullYear()}` : "";
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} de ${mes(b)}${ano}`;
  return `${a.getDate()} de ${mes(a)} – ${b.getDate()} de ${mes(b)}${ano}`;
}

export function AgendaPage() {
  const { notificar } = useToast();
  const [params, setParams] = useSearchParams();
  const { servicos, profissionais } = useCatalogoAgenda();

  const [visao, setVisao] = useState<Visao>(visaoInicial);
  const [dataRef, setDataRef] = useState<Date>(() => dataDoParametro(params.get("data")));
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [modalNovo, setModalNovo] = useState(false);
  const [preenchimento, setPreenchimento] = useState<PreenchimentoAgendamento | undefined>();
  const [emEdicao, setEmEdicao] = useState<Agendamento | null>(null);
  const selecionadoId = params.get("agendamento");
  const seletorDataRef = useRef<HTMLInputElement>(null);

  const { inicio, fim, rotuloPeriodo } = useMemo(() => {
    if (visao === "dia") return { inicio: dataRef, fim: somarDias(dataRef, 1), rotuloPeriodo: "do dia" };
    if (visao === "semana") {
      const seg = inicioDaSemana(dataRef);
      return { inicio: seg, fim: somarDias(seg, 7), rotuloPeriodo: "da semana" };
    }
    return { inicio: dataRef, fim: somarDias(dataRef, 7), rotuloPeriodo: "em 7 dias" };
  }, [visao, dataRef]);

  const carregar = useCallback(() => {
    const filtro = {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      ...(filtroProfissional && filtroProfissional !== SEM_PROFISSIONAL ? { profissionalId: filtroProfissional } : {}),
    };
    Promise.all([agendamentosApi.listarAgendamentos(filtro), agendamentosApi.resumoAgenda({ inicio: filtro.inicio, fim: filtro.fim })])
      .then(([lista, r]) => {
        setAgendamentos(lista);
        setResumo(r);
      })
      .catch((err) => notificar(mensagemDeErro(err), "erro"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim, filtroProfissional]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  // Outro funcionário mexeu na agenda: recarrega (com um pequeno atraso para agrupar rajadas).
  const timerSocket = useRef<ReturnType<typeof setTimeout>>();
  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;
  useSocketEvent("agendamento:alterado", () => {
    clearTimeout(timerSocket.current);
    timerSocket.current = setTimeout(() => carregarRef.current(), 400);
  });

  useEffect(() => {
    try {
      localStorage.setItem("fluxa_agenda_visao", visao);
    } catch {
      /* storage bloqueado */
    }
  }, [visao]);

  const visiveis = useMemo(
    () =>
      agendamentos.filter(
        (a) =>
          (mostrarCancelados || a.status !== "CANCELADO") &&
          (filtroProfissional !== SEM_PROFISSIONAL || a.profissionalId === null)
      ),
    [agendamentos, mostrarCancelados, filtroProfissional]
  );

  const hoje = new Date();

  const colunas: ColunaGrade[] = useMemo(() => {
    if (visao === "semana") {
      return Array.from({ length: 7 }, (_, i) => {
        const dia = somarDias(inicio, i);
        return {
          id: paraInputData(dia),
          dia,
          hoje: mesmoDia(dia, hoje),
          profissionalId: filtroProfissional && filtroProfissional !== SEM_PROFISSIONAL ? filtroProfissional : undefined,
          pertence: (a: Agendamento) => mesmoDia(new Date(a.inicio), dia),
          cabecalho: (
            <>
              <span style={{ color: "var(--fx-text-tertiary)", fontWeight: 500, textTransform: "capitalize" }}>
                {dia.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
              </span>
              <span className="fx-grade__dia-numero">{dia.getDate()}</span>
            </>
          ),
        };
      });
    }

    // Visão dia: uma coluna por profissional com atendimento no dia (ou o filtrado),
    // mais "A definir" quando há agendamento sem profissional.
    const idsComAgenda = new Set(visiveis.map((a) => a.profissionalId));
    const lista = filtroProfissional
      ? profissionais.filter((p) => p.id === filtroProfissional)
      : profissionais.filter((p) => idsComAgenda.has(p.id));
    const colunasProf: ColunaGrade[] = lista.map((p) => {
      const qtd = visiveis.filter((a) => a.profissionalId === p.id).length;
      return {
        id: p.id,
        dia: dataRef,
        hoje: false,
        profissionalId: p.id,
        pertence: (a: Agendamento) => a.profissionalId === p.id,
        cabecalho: (
          <>
            <span className="fx-avatar">{iniciais(p.nome)}</span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
            <span style={{ marginLeft: "auto", color: "var(--fx-text-tertiary)", fontWeight: 500 }}>{qtd}</span>
          </>
        ),
      };
    });

    const semProf = visiveis.filter((a) => a.profissionalId === null).length;
    if ((!filtroProfissional && (semProf > 0 || colunasProf.length === 0)) || filtroProfissional === SEM_PROFISSIONAL) {
      colunasProf.push({
        id: SEM_PROFISSIONAL,
        dia: dataRef,
        hoje: false,
        profissionalId: null,
        pertence: (a: Agendamento) => a.profissionalId === null,
        cabecalho: (
          <>
            <span className="fx-avatar" style={{ borderStyle: "dashed" }}>?</span>
            <span>{colunasProf.length === 0 && semProf === 0 ? "Agenda do dia" : "A definir"}</span>
            {semProf > 0 && <span style={{ marginLeft: "auto", color: "var(--fx-text-tertiary)", fontWeight: 500 }}>{semProf}</span>}
          </>
        ),
      });
    }
    return colunasProf;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, inicio, dataRef, visiveis, profissionais, filtroProfissional]);

  function navegar(direcao: -1 | 1) {
    setDataRef((d) => somarDias(d, direcao * (visao === "dia" ? 1 : 7)));
  }

  function abrirNovo(dados?: PreenchimentoAgendamento) {
    setPreenchimento(dados);
    setEmEdicao(null);
    setModalNovo(true);
  }

  function selecionar(id: string | null) {
    const novo = new URLSearchParams(params);
    if (id) novo.set("agendamento", id);
    else novo.delete("agendamento");
    setParams(novo, { replace: true });
  }

  function aplicarAlteracao(ag: Agendamento) {
    setAgendamentos((lista) => {
      const existe = lista.some((a) => a.id === ag.id);
      return existe ? lista.map((a) => (a.id === ag.id ? ag : a)) : [...lista, ag];
    });
    carregar();
  }

  const titulo =
    visao === "dia"
      ? mesmoDia(dataRef, hoje)
        ? `Hoje, ${dataRef.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
        : capitalizar(dataRef.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }))
      : tituloIntervalo(inicio, somarDias(fim, -1));

  const estaNoPeriodoAtual = hoje >= inicio && hoje < fim;

  return (
    <AppShell titulo="Agenda">
      <div className="fx-agenda-toolbar">
        <div className="fx-agenda-toolbar__data">
          <Button variant="secondary" size="sm" onClick={() => setDataRef(inicioDoDia(new Date()))} disabled={estaNoPeriodoAtual && visao !== "lista"}>
            Hoje
          </Button>
          <button className="fx-icon-btn" aria-label="Período anterior" onClick={() => navegar(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button className="fx-icon-btn" aria-label="Próximo período" onClick={() => navegar(1)}>
            <ChevronRight size={18} />
          </button>
          <h2 className="fx-agenda-toolbar__titulo">{titulo}</h2>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button className="fx-icon-btn" aria-label="Ir para uma data" onClick={() => seletorDataRef.current?.showPicker?.()}>
              <CalendarDays size={17} />
            </button>
            <input
              ref={seletorDataRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}
              value={paraInputData(dataRef)}
              onChange={(e) => e.target.value && setDataRef(dataDoParametro(e.target.value))}
            />
          </div>
        </div>

        <div className="fx-agenda-toolbar__acoes">
          <div className="fx-segmentado" role="group" aria-label="Visualização">
            {(["dia", "semana", "lista"] as Visao[]).map((v) => (
              <button key={v} type="button" aria-pressed={visao === v} onClick={() => setVisao(v)}>
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Lista"}
              </button>
            ))}
          </div>
          <Select
            aria-label="Filtrar por profissional"
            opcoes={[
              { value: "", label: "Todos os profissionais" },
              ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
              { value: SEM_PROFISSIONAL, label: "Sem profissional definido" },
            ]}
            value={filtroProfissional}
            onChange={(e) => setFiltroProfissional(e.target.value)}
            style={{ height: 36, width: 210, maxWidth: "100%" }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={mostrarCancelados} onChange={(e) => setMostrarCancelados(e.target.checked)} />
            Mostrar cancelados
          </label>
          <Button onClick={() => abrirNovo()}>
            <CalendarPlus size={16} aria-hidden />
            Novo agendamento
          </Button>
        </div>
      </div>

      <ResumoAgenda resumo={resumo} rotuloPeriodo={rotuloPeriodo} />

      {visao === "lista" ? (
        visiveis.length === 0 && !carregando ? (
          <div className="fx-card fx-vazio">
            <strong>Nenhum agendamento nos próximos 7 dias</strong>
            Os horários marcados pela equipe aparecem aqui, agrupados por dia.
            <Button size="sm" onClick={() => abrirNovo({ inicio: undefined })} style={{ marginTop: 8 }}>
              Agendar cliente
            </Button>
          </div>
        ) : (
          <ListaAgenda agendamentos={visiveis} onSelecionar={(a) => selecionar(a.id)} />
        )
      ) : (
        <>
          <GradeAgenda
            colunas={colunas}
            agendamentos={visiveis}
            onSelecionar={(a) => selecionar(a.id)}
            onCriarEm={(ini, profissionalId) => abrirNovo({ inicio: ini, profissionalId })}
          />
          <p style={{ margin: 0, font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
            Clique num horário livre da grade para agendar ali. A cor de cada bloco é a do serviço.
          </p>
        </>
      )}

      <ModalAgendamento
        aberto={modalNovo}
        agendamento={emEdicao}
        preenchimento={preenchimento}
        servicos={servicos}
        profissionais={profissionais}
        onFechar={() => setModalNovo(false)}
        onSalvo={(ag) => {
          setModalNovo(false);
          aplicarAlteracao(ag);
          // Agendou fora do período na tela: leva a agenda até o dia marcado.
          const dia = new Date(ag.inicio);
          if (dia < inicio || dia >= fim) setDataRef(inicioDoDia(dia));
        }}
      />

      <PainelAgendamento
        agendamentoId={selecionadoId}
        onFechar={() => selecionar(null)}
        onAlterado={aplicarAlteracao}
        onEditar={(ag) => {
          selecionar(null);
          setEmEdicao(ag);
          setPreenchimento(undefined);
          setModalNovo(true);
        }}
      />
    </AppShell>
  );
}
