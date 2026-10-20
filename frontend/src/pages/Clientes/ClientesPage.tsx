import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, MessageCircle, Search, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { ModalCliente } from "@/components/clientes/ModalCliente";
import { usePermissao } from "@/hooks/usePermissao";
import * as clientesApi from "@/api/clientes.api";
import type { ClienteListado, FiltrosClientes } from "@/api/clientes.api";
import { formatarData, formatarDataHora } from "@/utils/formatDate";
import { formatarTelefone, iniciais, linkWhatsApp } from "@/utils/agenda";

const TAMANHO_PAGINA = 25;

export function ClientesPage() {
  const navigate = useNavigate();
  const { notificar } = useToast();
  const { atende } = usePermissao();

  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState<NonNullable<FiltrosClientes["status"]>>("ativos");
  const [ordenar, setOrdenar] = useState<NonNullable<FiltrosClientes["ordenar"]>>("nome");
  const [pagina, setPagina] = useState(1);

  const [dados, setDados] = useState<{ itens: ClienteListado[]; total: number } | null>(null);
  const [tags, setTags] = useState<{ tag: string; total: number }[]>([]);
  const [modalNovo, setModalNovo] = useState(false);

  // Busca enquanto digita, sem disparar uma requisição por tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const filtros: FiltrosClientes = { busca: buscaAplicada, tag, status, ordenar, pagina, tamanhoPagina: TAMANHO_PAGINA };

  function carregar() {
    clientesApi
      .listarClientes(filtros)
      .then(setDados)
      .catch((err) => notificar(mensagemDeErro(err), "erro"));
  }

  useEffect(carregar, [buscaAplicada, tag, status, ordenar, pagina]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clientesApi.listarTags().then(setTags).catch(() => undefined);
  }, []);

  async function exportar() {
    try {
      await clientesApi.exportarClientes({ busca: buscaAplicada, tag, status });
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / TAMANHO_PAGINA)) : 1;
  const filtrando = !!(buscaAplicada || tag || status !== "ativos");

  return (
    <AppShell titulo="Clientes">
      <div className="fx-agenda-toolbar">
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 420 }}>
          <Search
            size={16}
            aria-hidden
            style={{ position: "absolute", left: 12, top: 12, color: "var(--fx-text-tertiary)", pointerEvents: "none" }}
          />
          <input
            className="fx-input"
            type="search"
            aria-label="Buscar clientes"
            placeholder="Buscar por nome, telefone, CPF ou e-mail"
            style={{ width: "100%", paddingLeft: 36 }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="fx-agenda-toolbar__acoes">
          {atende("GERENTE") && (
            <Button variant="secondary" onClick={exportar}>
              <Download size={16} aria-hidden />
              Exportar CSV
            </Button>
          )}
          <Button onClick={() => setModalNovo(true)}>
            <UserPlus size={16} aria-hidden />
            Novo cliente
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Select
          aria-label="Filtrar por tag"
          opcoes={[{ value: "", label: "Todas as tags" }, ...tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.total})` }))]}
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setPagina(1);
          }}
          style={{ height: 36, width: 180 }}
        />
        <Select
          aria-label="Situação do cadastro"
          opcoes={[
            { value: "ativos", label: "Ativos" },
            { value: "inativos", label: "Inativos" },
            { value: "todos", label: "Todos" },
          ]}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPagina(1);
          }}
          style={{ height: 36, width: 130 }}
        />
        <Select
          aria-label="Ordenar"
          opcoes={[
            { value: "nome", label: "Ordem alfabética" },
            { value: "recentes", label: "Cadastrados recentemente" },
            { value: "ultimaVisita", label: "Última visita" },
          ]}
          value={ordenar}
          onChange={(e) => {
            setOrdenar(e.target.value as typeof ordenar);
            setPagina(1);
          }}
          style={{ height: 36, width: 210 }}
        />
        {dados && (
          <span style={{ marginLeft: "auto", font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
            {dados.total} {dados.total === 1 ? "cliente" : "clientes"}
          </span>
        )}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {dados && dados.itens.length === 0 ? (
          <div className="fx-vazio">
            <strong>{filtrando ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}</strong>
            {filtrando
              ? "Tente outro termo de busca ou limpe os filtros."
              : "Cadastre aqui ou direto no agendamento: quem atende no balcão já consegue registrar o cliente."}
            {!filtrando && (
              <Button size="sm" onClick={() => setModalNovo(true)} style={{ marginTop: 8 }}>
                Cadastrar primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="fx-table-scroll">
            <table className="fx-table fx-table--clicavel">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Cliente</th>
                  <th>Telefone</th>
                  <th>Última visita</th>
                  <th>Atendimentos</th>
                  <th>Próximo horário</th>
                </tr>
              </thead>
              <tbody>
                {(dados?.itens ?? []).map((c) => {
                  const whatsapp = linkWhatsApp(c.telefone);
                  return (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/clientes/${c.id}`)}
                    >
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="fx-avatar">{iniciais(c.nome)}</span>
                          <div>
                            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                              {c.nome}
                              {!c.ativo && <Badge variant="neutral">Inativo</Badge>}
                            </div>
                            {c.tags.length > 0 && (
                              <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                                {c.tags.slice(0, 3).map((t) => (
                                  <span key={t} className="fx-tag" style={{ height: 18, fontSize: 11 }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.telefone ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            {formatarTelefone(c.telefone)}
                            {whatsapp && (
                              <a
                                href={whatsapp}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Abrir WhatsApp de ${c.nome}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: "var(--fx-text-tertiary)", display: "inline-flex" }}
                              >
                                <MessageCircle size={15} />
                              </a>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--fx-text-tertiary)" }}>—</span>
                        )}
                      </td>
                      <td>{c.ultimaVisita ? formatarData(c.ultimaVisita) : <span style={{ color: "var(--fx-text-tertiary)" }}>Nunca</span>}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{c.atendimentos}</td>
                      <td>{c.proximo ? formatarDataHora(c.proximo) : <span style={{ color: "var(--fx-text-tertiary)" }}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPaginas > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <span style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)" }}>
            Página {pagina} de {totalPaginas}
          </span>
          <Button variant="secondary" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <ModalCliente
        aberto={modalNovo}
        onFechar={() => setModalNovo(false)}
        onSalvo={(c) => {
          setModalNovo(false);
          navigate(`/clientes/${c.id}`);
        }}
      />
    </AppShell>
  );
}
