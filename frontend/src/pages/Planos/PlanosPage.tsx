import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as planosApi from "@/api/planos.api";
import * as assinaturaApi from "@/api/assinatura.api";
import type { Plano } from "@/api/planos.api";
import type { CicloAssinatura } from "@/api/assinatura.api";

export function PlanosPage() {
  const navigate = useNavigate();
  const { notificar } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [ciclo, setCiclo] = useState<CicloAssinatura>("MENSAL");
  const [carregando, setCarregando] = useState(true);
  const [assinando, setAssinando] = useState<string | null>(null);

  useEffect(() => {
    planosApi
      .listar()
      .then(setPlanos)
      .catch((err) => notificar(mensagemDeErro(err), "erro"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAssinar(planoId: string) {
    setAssinando(planoId);
    try {
      const { checkoutUrl } = await assinaturaApi.iniciarCheckout(planoId, ciclo);
      window.location.href = checkoutUrl;
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
      setAssinando(null);
    }
  }

  if (carregando) {
    return <div style={{ padding: 32, textAlign: "center" }}>Carregando planos…</div>;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--fx-surface-page)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ font: "var(--fx-heading-1)", marginBottom: 8 }}>Escolha seu plano</div>
          <div style={{ font: "var(--fx-body)", color: "var(--fx-text-tertiary)" }}>
            Seu teste grátis de 3 dias já está ativo — escolha um plano quando quiser.
          </div>

          <div
            style={{
              display: "inline-flex",
              marginTop: 20,
              border: "1px solid var(--fx-border-strong)",
              borderRadius: "var(--fx-radius-pill)",
              padding: 3,
              gap: 3,
            }}
          >
            {(["MENSAL", "ANUAL"] as CicloAssinatura[]).map((c) => (
              <button
                key={c}
                onClick={() => setCiclo(c)}
                className={`fx-btn fx-btn--sm ${ciclo === c ? "fx-btn--primary" : "fx-btn--ghost"}`}
                style={{ borderRadius: "var(--fx-radius-pill)" }}
              >
                {c === "MENSAL" ? "Mensal" : "Anual (2 meses grátis)"}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {planos.map((plano) => {
            const valor = ciclo === "MENSAL" ? plano.valorMensal : plano.valorAnual;
            return (
              <Card key={plano.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ font: "var(--fx-heading-3)" }}>{plano.nome}</div>
                  <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>{plano.descricao}</div>
                </div>
                <div>
                  <span style={{ font: "var(--fx-heading-1)" }}>R$ {Number(valor).toFixed(2)}</span>
                  <span style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
                    {" "}
                    /{ciclo === "MENSAL" ? "mês" : "ano"}
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {plano.funcionalidades.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, font: "var(--fx-body-sm)" }}>
                      <Check size={16} style={{ color: "var(--fx-color-success)", flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button block disabled={assinando === plano.id} onClick={() => handleAssinar(plano.id)}>
                  {assinando === plano.id ? "Gerando link de pagamento…" : "Assinar"}
                </Button>
              </Card>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => navigate("/terminais")}
            style={{ background: "none", border: "none", color: "var(--fx-text-tertiary)", cursor: "pointer", font: "var(--fx-body-sm)" }}
          >
            Continuar com o teste grátis por enquanto
          </button>
        </div>
      </div>
    </div>
  );
}
