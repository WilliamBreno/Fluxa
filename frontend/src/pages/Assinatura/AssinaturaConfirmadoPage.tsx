import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as assinaturaApi from "@/api/assinatura.api";

/** Destino do redirect_url do provedor de pagamento após o checkout — a confirmação de verdade vem do webhook, isso aqui só reflete o status atual. */
export function AssinaturaConfirmadoPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verificando" | "ativa" | "pendente">("verificando");

  useEffect(() => {
    assinaturaApi
      .obterStatus()
      .then((a) => setStatus(a.status === "ATIVA" ? "ativa" : "pendente"))
      .catch(() => setStatus("pendente"));
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        {status === "verificando" && <Loader2 size={40} className="fx-spin" style={{ marginBottom: 12 }} />}
        {status === "ativa" && <CircleCheck size={40} style={{ color: "var(--fx-color-success)", marginBottom: 12 }} />}

        <div style={{ font: "var(--fx-heading-3)", marginBottom: 8 }}>
          {status === "verificando" && "Verificando pagamento…"}
          {status === "ativa" && "Assinatura confirmada!"}
          {status === "pendente" && "Pagamento em processamento"}
        </div>
        <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
          {status === "pendente" &&
            "Assim que a confirmação chegar do provedor de pagamento, seu acesso é liberado automaticamente."}
        </p>
        <Button style={{ marginTop: 16 }} onClick={() => navigate("/terminais")}>
          Continuar
        </Button>
      </Card>
    </div>
  );
}
