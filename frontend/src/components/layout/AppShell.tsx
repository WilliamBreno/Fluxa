import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  titulo: string;
  children: ReactNode;
}

export function AppShell({ titulo, children }: AppShellProps) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--fx-surface-page)" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar titulo={titulo} />
        <main className="fx-scroll" style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: 24 }}>
          <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
