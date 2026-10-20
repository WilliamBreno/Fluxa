import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, CheckCheck, MessageCircle, Pencil, Play, UserX, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as agendamentosApi from "@/api/agendamentos.api";
import type { Agendamento, AgendamentoDetalhe, StatusAgendamento } from "@/api/agendamentos.api";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDataHora } from "@/utils/formatDate";
import {
  ROTULO_STATUS,
  capitalizar,
  STATUS_EDITAVEIS,
  TRANSICOES_STATUS,
  VARIANTE_STATUS,
  duracaoMinutos,
  formatarDiaExtenso,
  formatarDuracao,
  formatarHora,
  formatarTelefone,
  linkWhatsApp,
} from "@/utils/agenda";

interface PainelAgendamentoProps {
  agendamentoId: string | null;
  onFechar: () => void;
  onAlterado: (agendamento: Agendamento) => void;
  onEditar: (agendamento: Agendamento) => void;
}

const ROTULO_ACAO_HISTORICO: Record<string, string> = {
  AGENDAMENTO_CRIADO: "Agendamento criado",
  AGENDAMENTO_ATUALIZADO: "Agendamento alterado",
  AGENDAMENTO_STATUS_ALTERADO: "Status alterado",
};

/** A ação principal muda conforme o momento: confirmar → iniciar → concluir. */
function proximaAcao(status: StatusAgendamento): { status: StatusAgendamento; rotulo: string; Icone: typeof Check } | null {
  if (status === "AGENDADO") return { status: "CONFIRMADO", rotulo: "Confirmar presença", Icone: Check };
  if (status === "CONFIRMADO") return { status: "EM_ATENDIMENTO", rotulo: "Iniciar atendimento", Icone: Play };
  if (status === "EM_ATENDIMENTO") return { status: "CONCLUIDO", rotulo: "Concluir atendimento", Icone: CheckCheck };
  return null;
}

function descreverHistorico(item: AgendamentoDetalhe["historico"][number]): string {
  const d = item.detalhesJson ?? {};
  if (item.acao === "AGENDAMENTO_STATUS_ALTERADO") {
    const para = ROTULO_STATUS[d.para as StatusAgendamento] ?? String(d.para);
    return d.motivo ? `${para}: ${d.motivo}` : para;
  }
  if (item.acao === "AGENDAMENTO_ATUALIZADO" && d.reagendado) {
    const para = d.para as { inicio: string } | undefined;
    return para ? `Reagendado para ${formatarDataHora(para.inicio)}` : "Reagendado";
  }
  return ROTULO_ACAO_HISTORICO[item.acao] ?? item.acao;
}

export function PainelAgendamento({ agendamentoId, onFechar, onAlterado, onEditar }: PainelAgendamentoProps) {
  const { notificar } = useToast();
  const [detalhe, setDetalhe] = useState<AgendamentoDetalhe | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  function carregar(id: string) {
    agendamentosApi
      .obterAgendamento(id)
      .then(setDetalhe)
      .catch((err) => {
        notificar(mensagemDeErro(err), "erro");
        onFechar();
      });
  }

  useEffect(() => {
    setDetalhe(null);
    setCancelando(false);
    setMotivo("");
    if (agendamentoId) carregar(agendamentoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentoId]);

  async function mudarStatus(status: StatusAgendamento, motivoCancelamento?: string) {
    if (!detalhe) return;
    setEnviando(true);
    try {
      const atualizado = await agendamentosApi.alterarStatus(detalhe.id, status, motivoCancelamento);
      notificar(`Agendamento marcado como “${ROTULO_STATUS[status].toLowerCase()}”.`, "sucesso");
      onAlterado(atualizado);
      setCancelando(false);
      carregar(detalhe.id);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  const aberto = agendamentoId !== null;
  if (!aberto) return null;

  if (!detalhe) {
    return (
      <Modal aberto titulo="Agendamento" onFechar={onFechar} largura={520}>
        <p style={{ color: "var(--fx-text-tertiary)" }}>Carregando…</p>
      </Modal>
    );
  }

  const inicio = new Date(detalhe.inicio);
  const transicoes = TRANSICOES_STATUS[detalhe.status];
  const acao = proximaAcao(detalhe.status);
  const jaComecou = inicio.getTime() <= Date.now();
  const mensagemConfirmacao = `Olá, ${detalhe.cliente.nome.split(" ")[0]}! Passando para confirmar seu horário${
    detalhe.servico ? ` de ${detalhe.servico.nome}` : ""
  } em ${formatarDiaExtenso(inicio)}, às ${formatarHora(inicio)}. Podemos confirmar?`;
  const whatsapp = linkWhatsApp(detalhe.cliente.telefone, mensagemConfirmacao);

  return (
    <Modal aberto titulo="Agendamento" onFechar={onFechar} largura={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <Link
              to={`/clientes/${detalhe.cliente.id}`}
              style={{ font: "var(--fx-heading-3)", textDecoration: "none", letterSpacing: "var(--fx-tracking-tight)" }}
            >
              {detalhe.cliente.nome}
            </Link>
            <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", marginTop: 2 }}>
              {formatarTelefone(detalhe.cliente.telefone) || "Sem telefone cadastrado"}
            </div>
          </div>
          <Badge variant={VARIANTE_STATUS[detalhe.status]}>{ROTULO_STATUS[detalhe.status]}</Badge>
        </div>

        <dl className="fx-atributos">
          <dt>Quando</dt>
          <dd>
            {capitalizar(formatarDiaExtenso(inicio))}, {formatarHora(detalhe.inicio)}–{formatarHora(detalhe.fim)}
            <span style={{ color: "var(--fx-text-tertiary)" }}>
              {" "}
              · {formatarDuracao(duracaoMinutos(detalhe.inicio, detalhe.fim))}
            </span>
          </dd>
          <dt>Serviço</dt>
          <dd>
            {detalhe.servico ? (
              <span className="fx-chip-servico" style={{ ["--fx-evento-cor" as string]: detalhe.servico.cor }}>
                <span>{detalhe.servico.nome}</span>
              </span>
            ) : (
              "—"
            )}
          </dd>
          <dt>Profissional</dt>
          <dd>{detalhe.profissional?.nome ?? "A definir"}</dd>
          <dt>Valor</dt>
          <dd>{detalhe.valor !== null ? formatarBRL(detalhe.valor) : "—"}</dd>
          {detalhe.observacoes && (
            <>
              <dt>Observações</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{detalhe.observacoes}</dd>
            </>
          )}
          {detalhe.motivoCancelamento && (
            <>
              <dt>Motivo</dt>
              <dd>{detalhe.motivoCancelamento}</dd>
            </>
          )}
          <dt>Marcado por</dt>
          <dd>
            {detalhe.criadoPor?.nome} em {formatarDataHora(detalhe.createdAt)}
          </dd>
        </dl>

        {cancelando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Textarea
              label="Motivo do cancelamento"
              autoFocus
              rows={2}
              placeholder="Ex.: cliente pediu para remarcar"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setCancelando(false)}>
                Voltar
              </Button>
              <Button variant="danger" disabled={!motivo.trim() || enviando} onClick={() => mudarStatus("CANCELADO", motivo.trim())}>
                Cancelar agendamento
              </Button>
            </div>
          </div>
        ) : (
          (transicoes.length > 0 || whatsapp) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {acao && (
                <Button block disabled={enviando} onClick={() => mudarStatus(acao.status)}>
                  <acao.Icone size={16} aria-hidden />
                  {acao.rotulo}
                </Button>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {whatsapp && detalhe.status === "AGENDADO" && (
                  <a className="fx-btn fx-btn--secondary fx-btn--sm" href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} aria-hidden />
                    Pedir confirmação
                  </a>
                )}
                {STATUS_EDITAVEIS.includes(detalhe.status) && (
                  <Button variant="secondary" size="sm" onClick={() => onEditar(detalhe)}>
                    <Pencil size={15} aria-hidden />
                    Editar / reagendar
                  </Button>
                )}
                {transicoes.includes("CONCLUIDO") && detalhe.status !== "EM_ATENDIMENTO" && (
                  <Button variant="secondary" size="sm" disabled={enviando} onClick={() => mudarStatus("CONCLUIDO")}>
                    <CheckCheck size={15} aria-hidden />
                    Concluir direto
                  </Button>
                )}
                {transicoes.includes("FALTOU") && jaComecou && (
                  <Button variant="secondary" size="sm" disabled={enviando} onClick={() => mudarStatus("FALTOU")}>
                    <UserX size={15} aria-hidden />
                    Não compareceu
                  </Button>
                )}
                {detalhe.status === "CONFIRMADO" && (
                  <Button variant="ghost" size="sm" disabled={enviando} onClick={() => mudarStatus("AGENDADO")}>
                    <CalendarClock size={15} aria-hidden />
                    Desfazer confirmação
                  </Button>
                )}
                {transicoes.includes("CANCELADO") && (
                  <Button variant="ghost" size="sm" onClick={() => setCancelando(true)} style={{ color: "var(--fx-color-danger)" }}>
                    <XCircle size={15} aria-hidden />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )
        )}

        {detalhe.historico.length > 0 && (
          <div>
            <div className="fx-form-secao" style={{ paddingBottom: 10 }}>
              Histórico
            </div>
            <ol className="fx-timeline">
              {detalhe.historico.map((h) => (
                <li key={h.id} className="fx-timeline__item">
                  <div className="fx-timeline__texto">{descreverHistorico(h)}</div>
                  <div className="fx-timeline__meta">
                    {h.usuario?.nome ?? "Sistema"} · {formatarDataHora(h.createdAt)}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}
