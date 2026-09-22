import { useNavigate } from "react-router-dom";
import { CircleUserRound, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { StatusOffline } from "./StatusOffline";
import { NotificacoesBell } from "./NotificacoesBell";

interface TopBarProps {
  titulo: string;
  onAbrirMenu: () => void;
}

export function TopBar({ titulo, onAbrirMenu }: TopBarProps) {
  const { usuario, papelAtual, sair } = useAuth();
  const navigate = useNavigate();

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
        <StatusOffline />
        <NotificacoesBell />

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
