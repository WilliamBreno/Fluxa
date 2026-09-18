import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as movimentacoesApi from "@/api/movimentacoes.api";

interface FormSangriaProps {
  aberto: boolean;
  turnoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function FormSangria({ aberto, turnoId, onFechar, onSucesso }: FormSangriaProps) {
  const { notificar } = useToast();
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await movimentacoesApi.criarMovimentacao(turnoId, {
        tipo: "SANGRIA",
        valor: Number(valor.replace(",", ".")),
        motivo,
      });
      notificar("Sangria registrada.", "sucesso");
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
    <Modal aberto={aberto} titulo="Registrar sangria (retirada)" onFechar={onFechar}>
      <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", marginTop: 0 }}>
        Retirada de dinheiro da gaveta. Exige autorização de supervisor, gerente ou admin, e o motivo fica
        registrado permanentemente — não pode ser excluído.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          label="Valor retirado (R$)"
          type="number"
          step="0.01"
          min={0.01}
          required
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Input
          label="Motivo (obrigatório)"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: depósito bancário, pagamento de fornecedor"
        />
        <Button type="submit" variant="danger" disabled={enviando}>
          {enviando ? "Registrando…" : "Confirmar sangria"}
        </Button>
      </form>
    </Modal>
  );
}
