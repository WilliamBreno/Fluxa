import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  titulo: string;
  children: ReactNode;
}

export function AppShell({ titulo, children }: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  // Fecha a gaveta do menu automaticamente ao trocar de página (mobile).
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  // Trava o scroll do conteúdo atrás enquanto a gaveta do menu está aberta.
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  return (
    <div className="fx-shell">
      <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />
      <div className="fx-main">
        <TopBar titulo={titulo} onAbrirMenu={() => setMenuAberto(true)} />
        <main className="fx-scroll fx-main-content">
          <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
