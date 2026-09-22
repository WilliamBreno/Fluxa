import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import * as assinaturaApi from "@/api/assinatura.api";
import type { Assinatura } from "@/api/assinatura.api";
import { formatarDataHora } from "@/utils/formatDate";

export function AssinaturaPendentePage() {
  const { sair } = useAuth();
  const navigate = useNavigate();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);

  useEffect(() => {
    assinaturaApi.obterStatus().then(setAssinatura).catch(() => undefined);
  }, []);

  const motivo =
    assinatura?.status === "TRIAL"
      ? `Seu período de teste terminou em ${formatarDataHora(assinatura.trialFim)}.`
      : "O pagamento da sua assinatura não está confirmado.";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <CircleAlert size={40} style={{ color: "var(--fx-color-warning)", marginBottom: 12 }} />
        <div style={{ font: "var(--fx-heading-3)", marginBottom: 8 }}>Acesso bloqueado</div>
        <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
          {motivo} Escolha um plano para voltar a usar o Fluxa — seus dados continuam salvos.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <Button onClick={() => navigate("/planos")}>Ver planos e assinar</Button>
          <Button variant="ghost" onClick={() => sair().then(() => navigate("/login"))}>
            Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}
