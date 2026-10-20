import { useEffect, useId, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import * as clientesApi from "@/api/clientes.api";
import type { ClienteResumido } from "@/api/clientes.api";
import { ModalCliente } from "@/components/clientes/ModalCliente";
import { formatarTelefone, iniciais } from "@/utils/agenda";

interface SeletorClienteProps {
  valor: ClienteResumido | null;
  onChange: (cliente: ClienteResumido | null) => void;
  /** Trava o cliente (edição de agendamento existente ou agendar a partir da ficha). */
  bloqueado?: boolean;
  erro?: string;
}

export function SeletorCliente({ valor, onChange, bloqueado, erro }: SeletorClienteProps) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ClienteResumido[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(() => {
      clientesApi
        .buscarClientes(termo)
        .then((r) => {
          setResultados(r);
          setAtivo(0);
        })
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 220);
    return () => clearTimeout(t);
  }, [busca]);

  // Última opção da lista é sempre "cadastrar novo" — balcão não pode travar porque o cliente é novo.
  const totalOpcoes = resultados.length + (busca.trim().length >= 2 ? 1 : 0);

  function escolher(indice: number) {
    if (indice < resultados.length) {
      onChange(resultados[indice]);
      setBusca("");
      setAberto(false);
    } else {
      setModalNovo(true);
      setAberto(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto || totalOpcoes === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => (a + 1) % totalOpcoes);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => (a - 1 + totalOpcoes) % totalOpcoes);
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(ativo);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  if (valor) {
    return (
      <div className="fx-field">
        <label>Cliente</label>
        <div className="fx-cliente-selecionado">
          <span className="fx-avatar">{iniciais(valor.nome)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{valor.nome}</div>
            <div style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
              {formatarTelefone(valor.telefone) || "Sem telefone"}
            </div>
          </div>
          {!bloqueado && (
            <button
              type="button"
              className="fx-icon-btn"
              style={{ width: 28, height: 28, border: "none" }}
              aria-label="Trocar cliente"
              onClick={() => {
                onChange(null);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fx-field">
      <label htmlFor={`${listaId}-input`}>Cliente</label>
      <div className="fx-autocomplete">
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            aria-hidden
            style={{ position: "absolute", left: 12, top: 12, color: "var(--fx-text-tertiary)", pointerEvents: "none" }}
          />
          <input
            ref={inputRef}
            id={`${listaId}-input`}
            className={`fx-input ${erro ? "fx-input--erro" : ""}`}
            style={{ width: "100%", paddingLeft: 36 }}
            placeholder="Buscar por nome, telefone ou CPF"
            autoComplete="off"
            role="combobox"
            aria-expanded={aberto && totalOpcoes > 0}
            aria-controls={listaId}
            aria-autocomplete="list"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => setTimeout(() => setAberto(false), 150)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {aberto && totalOpcoes > 0 && (
          <ul className="fx-autocomplete__lista" id={listaId} role="listbox">
            {resultados.map((c, i) => (
              <li key={c.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === ativo}
                  className="fx-autocomplete__opcao"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(i)}
                  onMouseEnter={() => setAtivo(i)}
                >
                  <span className="fx-avatar">{iniciais(c.nome)}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 600 }}>{c.nome}</span>
                    <span style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
                      {formatarTelefone(c.telefone) || "Sem telefone"}
                      {c.tags.length > 0 && ` · ${c.tags.join(", ")}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={ativo === resultados.length}
                className="fx-autocomplete__opcao"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(resultados.length)}
                onMouseEnter={() => setAtivo(resultados.length)}
                style={{ borderTop: resultados.length ? "1px solid var(--fx-border-subtle)" : undefined }}
              >
                <span className="fx-avatar" style={{ background: "var(--fx-text-primary)", color: "var(--fx-surface-page)" }}>
                  <UserPlus size={14} />
                </span>
                <span>
                  Cadastrar <strong>“{busca.trim()}”</strong> como novo cliente
                </span>
              </button>
            </li>
          </ul>
        )}
        {busca.trim().length >= 2 && !buscando && resultados.length === 0 && !aberto && (
          <span className="fx-erro-msg" style={{ color: "var(--fx-text-tertiary)" }}>
            Nenhum cliente encontrado.
          </span>
        )}
      </div>
      {erro && <span className="fx-erro-msg">{erro}</span>}

      <ModalCliente
        aberto={modalNovo}
        nomeInicial={/\d{3}/.test(busca) ? "" : busca.trim()}
        onFechar={() => setModalNovo(false)}
        onSalvo={(novo) => {
          setModalNovo(false);
          setBusca("");
          onChange({ id: novo.id, nome: novo.nome, telefone: novo.telefone, cpf: novo.cpf, tags: novo.tags });
        }}
      />
    </div>
  );
}
