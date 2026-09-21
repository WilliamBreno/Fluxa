import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { useOfflineQueue } from "@/offline/useOfflineQueue";
import type { FormaPagamento } from "@/api/turnos.api";

const OPCOES_FORMA: { value: FormaPagamento; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "DEBITO", label: "Cartão de débito" },
  { value: "CREDITO", label: "Cartão de crédito" },
  { value: "PIX", label: "Pix" },
  { value: "VALE", label: "Vale" },
  { value: "FIADO", label: "Fiado / crediário" },
  { value: "OUTRO", label: "Outro" },
];

interface FormVendaProps {
  aberto: boolean;
  turnoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function FormVenda({ aberto, turnoId, onFechar, onSucesso }: FormVendaProps) {
  const { notificar } = useToast();
  const { enviarMovimentacao } = useOfflineQueue();
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("DINHEIRO");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  function limpar() {
    setValor("");
    setDescricao("");
    setFormaPagamento("DINHEIRO");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const resultado = await enviarMovimentacao(turnoId, {
        tipo: "VENDA",
        formaPagamento,
        valor: Number(valor.replace(",", ".")),
        descricao: descricao || undefined,
      });
      notificar(
        resultado.offline ? "Sem conexão: venda salva no dispositivo e será enviada automaticamente." : "Venda registrada.",
        resultado.offline ? "info" : "sucesso"
      );
      limpar();
      onSucesso();
      onFechar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo="Registrar venda" onFechar={onFechar}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Select
          label="Forma de pagamento"
          opcoes={OPCOES_FORMA}
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
        />
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          min={0.01}
          required
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Input
          label="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: itens vendidos"
        />
        <Button type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Registrar venda"}
        </Button>
      </form>
    </Modal>
  );
}
