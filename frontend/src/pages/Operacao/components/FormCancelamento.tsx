import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as movimentacoesApi from "@/api/movimentacoes.api";
import type { Movimentacao } from "@/api/movimentacoes.api";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDataHora } from "@/utils/formatDate";

interface FormCancelamentoProps {
  aberto: boolean;
  turnoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function FormCancelamento({ aberto, turnoId, onFechar, onSucesso }: FormCancelamentoProps) {
  const { notificar } = useToast();
  const [vendas, setVendas] = useState<Movimentacao[]>([]);
  const [vendaSelecionadaId, setVendaSelecionadaId] = useState("");
  const [tipo, setTipo] = useState<"CANCELAMENTO" | "DEVOLUCAO">("CANCELAMENTO");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    movimentacoesApi.listarMovimentacoes(turnoId).then((todas) => {
      const vendasAtivas = todas.filter((m) => m.tipo === "VENDA" && m.status === "ATIVA");
      setVendas(vendasAtivas);
      if (vendasAtivas[0]) setVendaSelecionadaId(vendasAtivas[0].id);
    });
  }, [aberto, turnoId]);

  const vendaSelecionada = vendas.find((v) => v.id === vendaSelecionadaId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!vendaSelecionada) return;
    setEnviando(true);
    try {
      await movimentacoesApi.criarMovimentacao(turnoId, {
        tipo,
        valor: Number(valor.replace(",", ".")),
        motivo,
        vendaReferenciaId: vendaSelecionada.id,
      });
      notificar(`${tipo === "CANCELAMENTO" ? "Cancelamento" : "Devolução"} registrado(a).`, "sucesso");
      setValor("");
      setMotivo("");
      onSucesso();
      onFechar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Cancelamento / devolução" onFechar={onFechar}>
      {vendas.length === 0 ? (
        <p style={{ color: "var(--fx-text-tertiary)" }}>Nenhuma venda ativa neste turno para cancelar/devolver.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select
            label="Venda original"
            opcoes={vendas.map((v) => ({
              value: v.id,
              label: `${formatarBRL(v.valor)} · ${v.formaPagamento} · ${formatarDataHora(v.createdAt)}`,
            }))}
            value={vendaSelecionadaId}
            onChange={(e) => setVendaSelecionadaId(e.target.value)}
          />
          <Select
            label="Tipo"
            opcoes={[
              { value: "CANCELAMENTO", label: "Cancelamento" },
              { value: "DEVOLUCAO", label: "Devolução" },
            ]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "CANCELAMENTO" | "DEVOLUCAO")}
          />
          <Input
            label={`Valor (máx. ${vendaSelecionada ? formatarBRL(vendaSelecionada.valor) : "-"})`}
            type="number"
            step="0.01"
            min={0.01}
            max={vendaSelecionada ? Number(vendaSelecionada.valor) : undefined}
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Input
            label="Motivo (obrigatório)"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Button type="submit" variant="danger" disabled={enviando}>
            {enviando ? "Registrando…" : "Confirmar"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
