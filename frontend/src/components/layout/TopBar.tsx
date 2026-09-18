import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CircleUserRound, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { Button } from "@/components/ui/Button";

interface TopBarProps {
  titulo: string;
  onAbrirMenu: () => void;
}

export function TopBar({ titulo, onAbrirMenu }: TopBarProps) {
  const { usuario, papelAtual, sair } = useAuth();
  const navigate = useNavigate();
  const [alertasNaoLidos, setAlertasNaoLidos] = useState(0);

  // Contador real de alertas recebidos ao vivo nesta sessão (teto de gaveta,
  // fechamento não realizado) — nunca um número fixo/decorativo.
  useSocketEvent("alerta:tetoGaveta", () => setAlertasNaoLidos((n) => n + 1));
  useSocketEvent("alerta:fechamentoNaoRealizado", () => setAlertasNaoLidos((n) => n + 1));

  async function handleSair() {
    await sair();
    navigate("/login");
  }

  return (
    <header className="fx-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <button onClick={onAbrirMenu} aria-label="Abrir menu" className="fx-menu-toggle">
          <Menu size={20} strokeWidth={2} />
        </button>
        <span
          className="fx-topbar-titulo"
          style={{
            font: "var(--fx-heading-4)",
            color: "var(--fx-text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {titulo}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => setAlertasNaoLidos(0)}
          aria-label={alertasNaoLidos > 0 ? `${alertasNaoLidos} alertas não lidos` : "Sem alertas novos"}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            flexShrink: 0,
            border: "none",
            borderRadius: "var(--fx-radius-control)",
            background: "transparent",
            color: "var(--fx-text-secondary)",
            cursor: "pointer",
          }}
        >
          <Bell size={18} strokeWidth={2} />
          {alertasNaoLidos > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--fx-color-danger)",
              }}
            />
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CircleUserRound size={28} strokeWidth={1.5} color="var(--fx-text-tertiary)" aria-hidden style={{ flexShrink: 0 }} />
          <div className="fx-topbar-usuario-texto" style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ font: "var(--fx-body-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {usuario?.nome}
            </div>
            <div className="fx-overline">{papelAtual}</div>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleSair}>
          <LogOut size={14} strokeWidth={2} />
          <span className="fx-topbar-sair-texto">Sair</span>
        </Button>
      </div>
    </header>
  );
}
