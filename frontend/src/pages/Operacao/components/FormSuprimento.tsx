import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as movimentacoesApi from "@/api/movimentacoes.api";

interface FormSuprimentoProps {
  aberto: boolean;
  turnoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function FormSuprimento({ aberto, turnoId, onFechar, onSucesso }: FormSuprimentoProps) {
  const { notificar } = useToast();
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await movimentacoesApi.criarMovimentacao(turnoId, {
        tipo: "SUPRIMENTO",
        valor: Number(valor.replace(",", ".")),
        motivo,
      });
      notificar("Suprimento registrado.", "sucesso");
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
    <Modal aberto={aberto} titulo="Registrar suprimento (reforço de troco)" onFechar={onFechar}>
      <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", marginTop: 0 }}>
        Entrada de dinheiro na gaveta que não é venda. O motivo fica registrado permanentemente.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          label="Motivo (obrigatório)"
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: reforço de troco vindo do cofre"
        />
        <Button type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Confirmar suprimento"}
        </Button>
      </form>
    </Modal>
  );
}
