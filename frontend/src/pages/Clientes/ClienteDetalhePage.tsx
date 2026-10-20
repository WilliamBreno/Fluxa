import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarPlus, MessageCircle, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { ModalCliente } from "@/components/clientes/ModalCliente";
import { ModalAgendamento } from "@/components/agenda/ModalAgendamento";
import { useCatalogoAgenda } from "@/hooks/useCatalogoAgenda";
import { usePermissao } from "@/hooks/usePermissao";
import * as clientesApi from "@/api/clientes.api";
import type { ClienteDetalhe, NotaCliente } from "@/api/clientes.api";
import type { Agendamento } from "@/api/agendamentos.api";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarData, formatarDataHora } from "@/utils/formatDate";
import {
  ROTULO_STATUS,
  VARIANTE_STATUS,
  formatarCpf,
  formatarDataPura,
  formatarHora,
  formatarTelefone,
  idade,
  iniciais,
  linkWhatsApp,
  paraInputData,
} from "@/utils/agenda";

type Aba = "historico" | "notas";

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notificar } = useToast();
  const { atende } = usePermissao();
  const { servicos, profissionais } = useCatalogoAgenda();

  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);
  const [historico, setHistorico] = useState<Agendamento[]>([]);
  const [notas, setNotas] = useState<NotaCliente[]>([]);
  const [aba, setAba] = useState<Aba>("historico");
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalAgendar, setModalAgendar] = useState(false);

  function carregar() {
    if (!id) return;
    clientesApi
      .obterCliente(id)
      .then(setCliente)
      .catch((err) => {
        notificar(mensagemDeErro(err), "erro");
        navigate("/clientes");
      });
    clientesApi.historicoCliente(id).then(setHistorico).catch(() => undefined);
    clientesApi.listarNotas(id).then(setNotas).catch(() => undefined);
  }

  useEffect(carregar, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function adicionarNota(e: FormEvent) {
    e.preventDefault();
    if (!id || !novaNota.trim()) return;
    setSalvandoNota(true);
    try {
      const nota = await clientesApi.criarNota(id, novaNota.trim());
      setNotas((n) => [nota, ...n]);
      setNovaNota("");
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setSalvandoNota(false);
    }
  }

  async function alternarAtivo() {
    if (!cliente) return;
    try {
      await clientesApi.atualizarCliente(cliente.id, { ativo: !cliente.ativo });
      notificar(cliente.ativo ? "Cliente inativado. O histórico continua guardado." : "Cliente reativado.", "sucesso");
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  if (!cliente) {
    return (
      <AppShell titulo="Cliente">
        <p style={{ color: "var(--fx-text-tertiary)" }}>Carregando…</p>
      </AppShell>
    );
  }

  const est = cliente.estatisticas;
  const whatsapp = linkWhatsApp(cliente.telefone);
  const anos = idade(cliente.dataNascimento);
  const hoje = new Date();
  const aniversarioHoje =
    cliente.dataNascimento &&
    cliente.dataNascimento.slice(5, 10) === `${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const endereco = [
    [cliente.logradouro, cliente.numero].filter(Boolean).join(", "),
    cliente.complemento,
    cliente.bairro,
    [cliente.cidade, cliente.uf].filter(Boolean).join(" / "),
  ]
    .filter(Boolean)
    .join(" · ");

  const kpis = [
    { rotulo: "Atendimentos", valor: String(est.concluidos), legenda: `${est.totalAgendamentos} agendamentos no total` },
    { rotulo: "Total gasto", valor: formatarBRL(est.totalGasto), legenda: `ticket médio ${formatarBRL(est.ticketMedio)}` },
    {
      rotulo: "Faltas",
      valor: String(est.faltas),
      legenda: `${est.taxaFaltas.toLocaleString("pt-BR")}% de ausência · ${est.cancelados} cancelado${est.cancelados === 1 ? "" : "s"}`,
    },
    {
      rotulo: "Última visita",
      valor: est.ultimaVisita ? formatarData(est.ultimaVisita) : "—",
      legenda: est.ultimoServico ?? "sem atendimento concluído",
    },
    {
      rotulo: "Próximo horário",
      valor: est.proximoAgendamento ? formatarData(est.proximoAgendamento.inicio) : "—",
      legenda: est.proximoAgendamento
        ? `${formatarHora(est.proximoAgendamento.inicio)} · ${ROTULO_STATUS[est.proximoAgendamento.status].toLowerCase()}`
        : "nada marcado",
    },
  ];

  return (
    <AppShell titulo="Ficha do cliente">
      <Link to="/clientes" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", textDecoration: "none", alignSelf: "flex-start" }}>
        <ArrowLeft size={15} aria-hidden /> Clientes
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span className="fx-avatar fx-avatar--lg">{iniciais(cliente.nome)}</span>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <h1 style={{ font: "var(--fx-heading-1)", letterSpacing: "var(--fx-tracking-tight)", margin: 0, overflowWrap: "anywhere" }}>
            {cliente.nome}
          </h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
            {!cliente.ativo && <Badge variant="neutral">Inativo</Badge>}
            {aniversarioHoje && <Badge variant="warning">Aniversário hoje</Badge>}
            {cliente.tags.map((t) => (
              <span key={t} className="fx-tag">
                {t}
              </span>
            ))}
            <span style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
              Cliente desde {formatarData(cliente.createdAt)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {whatsapp && (
            <a className="fx-btn fx-btn--secondary" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={16} aria-hidden />
              WhatsApp
            </a>
          )}
          <Button variant="secondary" onClick={() => setModalEditar(true)}>
            <Pencil size={16} aria-hidden />
            Editar
          </Button>
          {cliente.ativo && (
            <Button onClick={() => setModalAgendar(true)}>
              <CalendarPlus size={16} aria-hidden />
              Agendar
            </Button>
          )}
        </div>
      </div>

      <div className="fx-agenda-kpis">
        {kpis.map((k) => (
          <div key={k.rotulo} className="fx-agenda-kpi">
            <span className="fx-overline">{k.rotulo}</span>
            <span className="fx-agenda-kpi__valor">{k.valor}</span>
            <span className="fx-agenda-kpi__legenda">{k.legenda}</span>
          </div>
        ))}
      </div>

      <div className="fx-ficha-grid">
        <Card>
          <div style={{ font: "var(--fx-heading-4)", marginBottom: 14 }}>Dados cadastrais</div>
          <dl className="fx-atributos">
            <dt>Telefone</dt>
            <dd>{formatarTelefone(cliente.telefone) || "—"}</dd>
            <dt>E-mail</dt>
            <dd>{cliente.email ? <a href={`mailto:${cliente.email}`}>{cliente.email}</a> : "—"}</dd>
            <dt>CPF</dt>
            <dd>{formatarCpf(cliente.cpf) || "—"}</dd>
            <dt>Nascimento</dt>
            <dd>{cliente.dataNascimento ? `${formatarDataPura(cliente.dataNascimento)} (${anos} anos)` : "—"}</dd>
            <dt>Endereço</dt>
            <dd>{endereco || "—"}</dd>
            {cliente.cep && (
              <>
                <dt>CEP</dt>
                <dd>{cliente.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}</dd>
              </>
            )}
            <dt>Como conheceu</dt>
            <dd>{cliente.origem ?? "—"}</dd>
            <dt>Cadastrado por</dt>
            <dd>{cliente.criadoPor.nome}</dd>
          </dl>
          {cliente.observacoes && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--fx-border-subtle)" }}>
              <div className="fx-overline" style={{ marginBottom: 6 }}>
                Observações
              </div>
              <p style={{ margin: 0, font: "var(--fx-body-sm)", whiteSpace: "pre-wrap" }}>{cliente.observacoes}</p>
            </div>
          )}
          {atende("SUPERVISOR") && (
            <Button variant="ghost" size="sm" onClick={alternarAtivo} style={{ marginTop: 16, marginLeft: -12 }}>
              {cliente.ativo ? "Inativar cadastro" : "Reativar cadastro"}
            </Button>
          )}
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="fx-abas" role="tablist">
            <button role="tab" aria-selected={aba === "historico"} className={`fx-aba ${aba === "historico" ? "fx-aba--ativa" : ""}`} onClick={() => setAba("historico")}>
              Histórico de agendamentos ({historico.length})
            </button>
            <button role="tab" aria-selected={aba === "notas"} className={`fx-aba ${aba === "notas" ? "fx-aba--ativa" : ""}`} onClick={() => setAba("notas")}>
              Anotações ({notas.length})
            </button>
          </div>

          {aba === "historico" &&
            (historico.length === 0 ? (
              <div className="fx-vazio" style={{ padding: "24px 0" }}>
                <strong>Nenhum agendamento ainda</strong>
                Todo horário marcado para este cliente fica registrado aqui.
              </div>
            ) : (
              <div className="fx-table-scroll">
                <table className="fx-table fx-table--clicavel">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Serviço</th>
                      <th>Profissional</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((a) => {
                      const abrir = () => navigate(`/agenda?data=${paraInputData(new Date(a.inicio))}&agendamento=${a.id}`);
                      return (
                        <tr key={a.id} tabIndex={0} onClick={abrir} onKeyDown={(e) => e.key === "Enter" && abrir()}>
                          <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatarDataHora(a.inicio)}</td>
                          <td>
                            {a.servico ? (
                              <span className="fx-chip-servico" style={{ ["--fx-evento-cor" as string]: a.servico.cor }}>
                                <span>{a.servico.nome}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{a.profissional?.nome ?? "—"}</td>
                          <td>{a.valor !== null ? formatarBRL(a.valor) : "—"}</td>
                          <td>
                            <Badge variant={VARIANTE_STATUS[a.status]}>{ROTULO_STATUS[a.status]}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

          {aba === "notas" && (
            <>
              <form onSubmit={adicionarNota} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Textarea
                  aria-label="Nova anotação"
                  placeholder="Registre algo para a equipe: preferência, reclamação, combinado…"
                  rows={2}
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={salvandoNota || !novaNota.trim()} style={{ alignSelf: "flex-end" }}>
                  {salvandoNota ? "Salvando…" : "Adicionar anotação"}
                </Button>
              </form>
              {notas.length === 0 ? (
                <div className="fx-vazio" style={{ padding: "16px 0" }}>
                  Nenhuma anotação ainda. Elas ficam com autor e data, e não podem ser apagadas.
                </div>
              ) : (
                <ol className="fx-timeline">
                  {notas.map((n) => (
                    <li key={n.id} className="fx-timeline__item">
                      <div className="fx-timeline__meta">
                        <strong style={{ color: "var(--fx-text-secondary)" }}>{n.autor.nome}</strong> · {formatarDataHora(n.createdAt)}
                      </div>
                      <div className="fx-timeline__texto">{n.texto}</div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </Card>
      </div>

      <ModalCliente
        aberto={modalEditar}
        cliente={cliente}
        onFechar={() => setModalEditar(false)}
        onSalvo={() => {
          setModalEditar(false);
          carregar();
        }}
      />

      <ModalAgendamento
        aberto={modalAgendar}
        servicos={servicos}
        profissionais={profissionais}
        preenchimento={{ cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone, cpf: cliente.cpf, tags: cliente.tags } }}
        onFechar={() => setModalAgendar(false)}
        onSalvo={() => {
          setModalAgendar(false);
          carregar();
        }}
      />
    </AppShell>
  );
}
