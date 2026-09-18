import { NavLink } from "react-router-dom";
import { usePermissao } from "@/hooks/usePermissao";

interface ItemNav {
  to?: string;
  label: string;
  icone: string;
  secao?: string;
  minimo?: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
}

const ITENS: ItemNav[] = [
  { to: "/terminais", label: "Caixas", icone: "🧾" },
  { to: "/dashboard", label: "Visão geral", icone: "📊", minimo: "SUPERVISOR" },
  { secao: "Gestão", label: "", icone: "" },
  { to: "/relatorios", label: "Relatórios", icone: "📈", minimo: "SUPERVISOR" },
  { secao: "Sistema", label: "", icone: "" },
  { to: "/configuracoes", label: "Configurações", icone: "⚙️", minimo: "GERENTE" },
];

export function Sidebar() {
  const { atende } = usePermissao();

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        background: "var(--fx-surface-sidebar)",
        color: "var(--fx-text-on-sidebar)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
      }}
    >
      <div style={{ padding: "0 12px 24px", font: "var(--fx-heading-3)", color: "var(--fx-text-on-sidebar)" }}>
        Fluxa
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ITENS.map((item, i) =>
          item.secao ? (
            <div
              key={`secao-${i}`}
              className="fx-overline"
              style={{ color: "var(--fx-text-on-sidebar-muted)", padding: "16px 12px 6px" }}
            >
              {item.secao}
            </div>
          ) : item.minimo && !atende(item.minimo) ? null : (
            <NavLink
              key={item.to}
              to={item.to!}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: "var(--fx-radius-control)",
                color: isActive ? "var(--fx-text-on-sidebar)" : "var(--fx-text-on-sidebar-muted)",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                textDecoration: "none",
              })}
            >
              <span aria-hidden>{item.icone}</span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
