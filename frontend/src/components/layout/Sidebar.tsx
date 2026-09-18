import { NavLink } from "react-router-dom";
import { ChartPie, LayoutDashboard, Settings, Store, Wallet, type LucideIcon } from "lucide-react";
import { usePermissao } from "@/hooks/usePermissao";

type ItemNav =
  | { secao: string }
  | {
      to: string;
      label: string;
      Icone: LucideIcon;
      minimo?: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
    };

const ITENS: ItemNav[] = [
  { to: "/terminais", label: "Caixas", Icone: Store },
  { to: "/dashboard", label: "Visão geral", Icone: LayoutDashboard, minimo: "SUPERVISOR" },
  { secao: "Gestão" },
  { to: "/relatorios", label: "Relatórios", Icone: ChartPie, minimo: "SUPERVISOR" },
  { secao: "Sistema" },
  { to: "/configuracoes", label: "Configurações", Icone: Settings, minimo: "GERENTE" },
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 10px 24px",
          font: "var(--fx-heading-3)",
          color: "var(--fx-text-on-sidebar)",
        }}
      >
        <span className="fx-logo-badge">
          <Wallet size={16} strokeWidth={2.25} aria-hidden />
        </span>
        Fluxa
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ITENS.map((item, i) =>
          "secao" in item ? (
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
              to={item.to}
              className={({ isActive }) => `fx-nav-item ${isActive ? "fx-nav-item--active" : ""}`}
            >
              <item.Icone size={17} strokeWidth={2} aria-hidden />
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
