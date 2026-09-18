import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

interface TopBarProps {
  titulo: string;
}

export function TopBar({ titulo }: TopBarProps) {
  const { usuario, papelAtual, sair } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await sair();
    navigate("/login");
  }

  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--fx-border-subtle)",
        background: "var(--fx-surface-card)",
      }}
    >
      <span style={{ font: "var(--fx-heading-4)", color: "var(--fx-text-primary)" }}>{titulo}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ font: "var(--fx-body-sm)", fontWeight: 600 }}>{usuario?.nome}</div>
          <div className="fx-overline">{papelAtual}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSair}>
          Sair
        </Button>
      </div>
    </header>
  );
}
