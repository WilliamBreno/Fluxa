import { NavLink } from "react-router-dom";
import { ChartPie, CreditCard, LayoutDashboard, Settings, Store, Wallet, X, type LucideIcon } from "lucide-react";
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
  { to: "/conciliacao", label: "Conciliação de cartões", Icone: CreditCard, minimo: "SUPERVISOR" },
  { secao: "Sistema" },
  { to: "/configuracoes", label: "Configurações", Icone: Settings, minimo: "GERENTE" },
];

interface SidebarProps {
  aberta: boolean;
  onFechar: () => void;
}

export function Sidebar({ aberta, onFechar }: SidebarProps) {
  const { atende } = usePermissao();

  return (
    <>
      <div
        className={`fx-sidebar-backdrop ${aberta ? "fx-sidebar-backdrop--visivel" : ""}`}
        onClick={onFechar}
        aria-hidden
      />
      <aside className={`fx-sidebar ${aberta ? "fx-sidebar--aberta" : ""}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              font: "var(--fx-heading-3)",
              color: "var(--fx-text-on-sidebar)",
            }}
          >
            <span className="fx-logo-badge">
              <Wallet size={16} strokeWidth={2.25} aria-hidden />
            </span>
            Fluxa
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar menu"
            className="fx-menu-toggle"
            style={{ color: "var(--fx-text-on-sidebar-muted)" }}
          >
            <X size={20} strokeWidth={2} />
          </button>
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
                onClick={onFechar}
                className={({ isActive }) => `fx-nav-item ${isActive ? "fx-nav-item--active" : ""}`}
              >
                <item.Icone size={17} strokeWidth={2} aria-hidden />
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
