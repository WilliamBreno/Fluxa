import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as fechamentoApi from "@/api/fechamento.api";
import type { FechamentoCaixa } from "@/api/fechamento.api";
import type { FormaPagamento } from "@/api/turnos.api";

// IMPORTANTE: este componente NUNCA deve importar `obterDivergencia` nem
// `leituraX` — o operador precisa informar o que contou fisicamente ANTES de
// ver qualquer valor que o sistema esperava. É isso que torna a contagem uma
// medição de verdade, e não um exercício de "ajustar até bater".

const FORMAS: { value: FormaPagamento; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "DEBITO", label: "Cartão de débito" },
  { value: "CREDITO", label: "Cartão de crédito" },
  { value: "PIX", label: "Pix" },
  { value: "VALE", label: "Vale" },
  { value: "FIADO", label: "Fiado / crediário" },
  { value: "OUTRO", label: "Outro" },
];

interface EtapaContagemCegaProps {
  turnoId: string;
  onContagemRegistrada: (fechamento: FechamentoCaixa) => void;
}

export function EtapaContagemCega({ turnoId, onContagemRegistrada }: EtapaContagemCegaProps) {
  const { notificar } = useToast();
  const [valores, setValores] = useState<Record<FormaPagamento, string>>({
    DINHEIRO: "",
    DEBITO: "",
    CREDITO: "",
    PIX: "",
    VALE: "",
    FIADO: "",
    OUTRO: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    setEnviando(true);
    try {
      const contagens = FORMAS.map((f) => ({
        formaPagamento: f.value,
        valorContado: Number((valores[f.value] || "0").replace(",", ".")),
      }));
      const resultado = await fechamentoApi.registrarContagemCega(turnoId, contagens);
      onContagemRegistrada(resultado);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card style={{ maxWidth: 560 }}>
      <div style={{ font: "var(--fx-heading-3)", marginBottom: 4 }}>Contagem cega</div>
      <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", marginTop: 0 }}>
        Conte fisicamente o dinheiro na gaveta e informe o total apurado de cada forma de pagamento (extrato da
        maquininha, Pix etc.) <strong>antes</strong> de ver qualquer valor calculado pelo sistema. Depois de enviada,
        a contagem não pode ser editada.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FORMAS.map((f) => (
          <Input
            key={f.value}
            label={f.label}
            type="number"
            step="0.01"
            min={0}
            disabled={confirmando}
            value={valores[f.value]}
            onChange={(e) => setValores((v) => ({ ...v, [f.value]: e.target.value }))}
            placeholder="0,00"
          />
        ))}

        {!confirmando ? (
          <Button type="submit">Revisar contagem</Button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                background: "var(--fx-color-warning-bg)",
                border: "1px solid var(--fx-color-warning)",
                borderRadius: "var(--fx-radius-control)",
                padding: 12,
                font: "var(--fx-body-sm)",
              }}
            >
              Confira os valores acima com atenção — depois de confirmar, a contagem fica travada e não pode ser
              editada.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setConfirmando(false)} disabled={enviando}>
                Corrigir
              </Button>
              <Button type="submit" disabled={enviando} style={{ flex: 1 }}>
                {enviando ? "Enviando…" : "Confirmar contagem (travar)"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
