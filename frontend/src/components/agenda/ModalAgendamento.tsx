import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { SeletorCliente } from "./SeletorCliente";
import * as agendamentosApi from "@/api/agendamentos.api";
import type { Agendamento, Profissional } from "@/api/agendamentos.api";
import type { Servico } from "@/api/servicos.api";
import type { ClienteResumido } from "@/api/clientes.api";
import { deInputs, duracaoMinutos, formatarDuracao, formatarHora, paraInputData, paraInputHora } from "@/utils/agenda";

export interface PreenchimentoAgendamento {
  inicio?: Date;
  profissionalId?: string | null;
  cliente?: ClienteResumido;
}

interface ModalAgendamentoProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: (agendamento: Agendamento) => void;
  servicos: Servico[];
  profissionais: Profissional[];
  /** Presente = edição / reagendamento. */
  agendamento?: Agendamento | null;
  preenchimento?: PreenchimentoAgendamento;
}

const DURACOES = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240];

function proximoHorarioCheio(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export function ModalAgendamento({
  aberto,
  onFechar,
  onSalvo,
  servicos,
  profissionais,
  agendamento,
  preenchimento,
}: ModalAgendamentoProps) {
  const { notificar } = useToast();
  const [cliente, setCliente] = useState<ClienteResumido | null>(null);
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erroConflito, setErroConflito] = useState<string | null>(null);
  const [erroCliente, setErroCliente] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErroConflito(null);
    setErroCliente(undefined);
    if (agendamento) {
      const inicio = new Date(agendamento.inicio);
      setCliente({ ...agendamento.cliente, cpf: null });
      setServicoId(agendamento.servicoId ?? "");
      setProfissionalId(agendamento.profissionalId ?? "");
      setData(paraInputData(inicio));
      setHora(paraInputHora(inicio));
      setDuracao(duracaoMinutos(agendamento.inicio, agendamento.fim));
      setValor(agendamento.valor ? Number(agendamento.valor).toFixed(2) : "");
      setObservacoes(agendamento.observacoes ?? "");
    } else {
      const inicio = preenchimento?.inicio ?? proximoHorarioCheio();
      setCliente(preenchimento?.cliente ?? null);
      setServicoId("");
      setProfissionalId(preenchimento?.profissionalId ?? "");
      setData(paraInputData(inicio));
      setHora(paraInputHora(inicio));
      setDuracao(30);
      setValor("");
      setObservacoes("");
    }
    // Reinicia o formulário só ao abrir: quem chama costuma recriar `preenchimento`
    // a cada render, e depender dele apagaria o que o funcionário está digitando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function escolherServico(id: string) {
    setServicoId(id);
    const servico = servicos.find((s) => s.id === id);
    if (servico) {
      setDuracao(servico.duracaoMinutos);
      setValor(Number(servico.preco).toFixed(2));
    }
  }

  const inicio = data && hora ? deInputs(data, hora) : null;
  const fim = inicio ? new Date(inicio.getTime() + duracao * 60_000) : null;
  const noPassado = !agendamento && inicio !== null && inicio.getTime() < Date.now() - 5 * 60_000;

  const opcoesDuracao = useMemo(() => {
    const lista = DURACOES.includes(duracao) ? DURACOES : [...DURACOES, duracao].sort((a, b) => a - b);
    return lista.map((d) => ({ value: String(d), label: formatarDuracao(d) }));
  }, [duracao]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cliente) {
      setErroCliente("Selecione ou cadastre o cliente.");
      return;
    }
    if (!inicio || !fim) return;

    setSalvando(true);
    setErroConflito(null);
    const payload = {
      servicoId: servicoId || null,
      profissionalId: profissionalId || null,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      valor: valor === "" ? null : Number(valor.replace(",", ".")),
      observacoes: observacoes || null,
    };
    try {
      const salvo = agendamento
        ? await agendamentosApi.atualizarAgendamento(agendamento.id, payload)
        : await agendamentosApi.criarAgendamento({ ...payload, clienteId: cliente.id });

      const reconfirmar = agendamento?.status === "CONFIRMADO" && salvo.status === "AGENDADO";
      notificar(
        agendamento
          ? reconfirmar
            ? "Reagendado. Confirme o novo horário com o cliente."
            : "Agendamento atualizado."
          : "Agendamento criado.",
        "sucesso"
      );
      onSalvo(salvo);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      // Conflito de horário aparece dentro do formulário, perto de onde se corrige.
      if (status === 409) setErroConflito(mensagemDeErro(err));
      else notificar(mensagemDeErro(err), "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={agendamento ? "Editar agendamento" : "Novo agendamento"} onFechar={onFechar} largura={560}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SeletorCliente
          valor={cliente}
          onChange={(c) => {
            setCliente(c);
            setErroCliente(undefined);
          }}
          bloqueado={!!agendamento || !!preenchimento?.cliente}
          erro={erroCliente}
        />

        <div className="fx-form-grid">
          <Select
            label="Serviço"
            opcoes={[
              { value: "", label: "Sem serviço definido" },
              ...servicos.map((s) => ({ value: s.id, label: `${s.nome} · ${formatarDuracao(s.duracaoMinutos)}` })),
              ...(agendamento?.servico && !servicos.some((s) => s.id === agendamento.servico!.id)
                ? [{ value: agendamento.servico.id, label: `${agendamento.servico.nome} (inativo)` }]
                : []),
            ]}
            value={servicoId}
            onChange={(e) => escolherServico(e.target.value)}
          />
          <Select
            label="Profissional"
            opcoes={[
              { value: "", label: "Qualquer / a definir" },
              ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
              ...(agendamento?.profissional && !profissionais.some((p) => p.id === agendamento.profissional!.id)
                ? [{ value: agendamento.profissional.id, label: `${agendamento.profissional.nome} (inativo)` }]
                : []),
            ]}
            value={profissionalId}
            onChange={(e) => {
              setProfissionalId(e.target.value);
              setErroConflito(null);
            }}
          />
          <Input
            label="Data"
            type="date"
            required
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setErroConflito(null);
            }}
          />
          <div className="fx-form-grid" style={{ gap: 8 }}>
            <Input
              label="Início"
              type="time"
              step={300}
              required
              value={hora}
              onChange={(e) => {
                setHora(e.target.value);
                setErroConflito(null);
              }}
            />
            <Select
              label="Duração"
              opcoes={opcoesDuracao}
              value={String(duracao)}
              onChange={(e) => {
                setDuracao(Number(e.target.value));
                setErroConflito(null);
              }}
            />
          </div>
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
            ajuda="Preenchido pelo preço do serviço. Pode ajustar (desconto, pacote)."
          />
          <div className="fx-field" style={{ justifyContent: "flex-end" }}>
            {fim && (
              <span style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", paddingBottom: 10 }}>
                {formatarHora(inicio!)} até <strong style={{ color: "var(--fx-text-primary)" }}>{formatarHora(fim)}</strong>
              </span>
            )}
          </div>
        </div>

        <Textarea
          label="Observações"
          placeholder="Algo que a equipe precisa saber para este atendimento"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
        />

        {noPassado && (
          <div style={{ font: "var(--fx-caption)", color: "var(--fx-color-warning)" }}>
            Este horário já passou. Use para registrar um atendimento que não foi lançado na hora.
          </div>
        )}

        {erroConflito && (
          <div
            role="alert"
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: "var(--fx-radius-control)",
              background: "var(--fx-color-danger-bg)",
              color: "var(--fx-color-danger)",
              font: "var(--fx-body-sm)",
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <span>
              <strong>Horário indisponível.</strong> {erroConflito}
            </span>
          </div>
        )}

        {agendamento?.status === "CONFIRMADO" && (
          <div style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
            Se mudar data ou horário, o agendamento volta para “Agendado” até o cliente confirmar de novo.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Button type="button" variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : agendamento ? "Salvar alterações" : "Agendar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
