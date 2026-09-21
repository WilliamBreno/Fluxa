import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as conciliacaoApi from "@/api/conciliacao.api";
import type { ConciliacaoCartao } from "@/api/conciliacao.api";
import { formatarBRL } from "@/utils/formatMoney";

interface ResolucaoManualModalProps {
  registro: ConciliacaoCartao | null;
  onFechar: () => void;
  onResolvido: () => void;
}

export function ResolucaoManualModal({ registro, onFechar, onResolvido }: ResolucaoManualModalProps) {
  const { notificar } = useToast();
  const [acao, setAcao] = useState<"aceitar" | "vincular" | "rejeitar">("aceitar");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (!registro) return;
    if (observacao.trim().length < 3) {
      notificar("Descreva o motivo da resolução (mínimo 3 caracteres).", "erro");
      return;
    }
    setEnviando(true);
    try {
      await conciliacaoApi.resolverManual(registro.id, { acao, observacao });
      notificar("Conciliação resolvida manualmente.", "sucesso");
      setObservacao("");
      onResolvido();
      onFechar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={!!registro} titulo="Resolver conciliação manualmente" onFechar={onFechar}>
      {registro && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)" }}>
            {registro.movimentacao && (
              <div>
                Venda: {formatarBRL(registro.movimentacao.valor)} · {registro.movimentacao.formaPagamento} ·{" "}
                {registro.movimentacao.turno.terminal.nome}
              </div>
            )}
            {registro.transacaoExtrato && (
              <div>
                Extrato: {formatarBRL(registro.transacaoExtrato.valorBruto)} · NSU {registro.transacaoExtrato.nsu ?? "-"} ·{" "}
                {registro.transacaoExtrato.bandeira ?? "-"}
              </div>
            )}
          </div>

          <Select
            label="Ação"
            opcoes={[
              { value: "aceitar", label: "Aceitar como está" },
              { value: "rejeitar", label: "Rejeitar (marcar como não aplicável)" },
            ]}
            value={acao}
            onChange={(e) => setAcao(e.target.value as "aceitar" | "vincular" | "rejeitar")}
          />

          <div className="fx-field">
            <label htmlFor="observacao-resolucao">Observação (obrigatória)</label>
            <textarea
              id="observacao-resolucao"
              className="fx-input"
              style={{ height: 80, padding: 8, resize: "vertical" }}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Explique por que está resolvendo manualmente este registro"
            />
          </div>

          <Button onClick={confirmar} disabled={enviando}>
            {enviando ? "Confirmando…" : "Confirmar resolução"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
