import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as assinaturaApi from "@/api/assinatura.api";

/**
 * Só existe porque PAGAMENTO_PROVIDER=stub — simula a tela de checkout da
 * InfinitePay pra dar pra testar o fluxo de assinatura de ponta a ponta sem
 * provedor real configurado. Some de uso assim que houver credenciais reais
 * (o checkout passa a ser a própria página da InfinitePay).
 */
export function AssinaturaSimularPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notificar } = useToast();
  const checkoutId = params.get("checkoutId") ?? "";
  const [processando, setProcessando] = useState(false);

  async function decidir(aprovado: boolean) {
    setProcessando(true);
    try {
      await assinaturaApi.simular(checkoutId, aprovado);
      notificar(aprovado ? "Pagamento aprovado (simulado)." : "Pagamento recusado (simulado).", aprovado ? "sucesso" : "erro");
      navigate("/terminais");
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ font: "var(--fx-heading-3)", marginBottom: 8 }}>Checkout simulado</div>
        <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
          Nenhum provedor de pagamento real está configurado ainda. Esta tela existe só para testar o fluxo de
          assinatura — em produção, esta etapa acontece na própria página da InfinitePay.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <Button disabled={processando || !checkoutId} onClick={() => decidir(true)}>
            Aprovar pagamento
          </Button>
          <Button variant="secondary" disabled={processando || !checkoutId} onClick={() => decidir(false)}>
            Simular recusa
          </Button>
        </div>
      </Card>
    </div>
  );
}
