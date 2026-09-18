import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SecaoGeral } from "./components/SecaoGeral";
import { SecaoUsuarios } from "./components/SecaoUsuarios";
import { SecaoTerminais } from "./components/SecaoTerminais";

type Aba = "geral" | "usuarios" | "terminais";

const ABAS: { value: Aba; label: string }[] = [
  { value: "geral", label: "Geral" },
  { value: "usuarios", label: "Usuários" },
  { value: "terminais", label: "Terminais" },
];

export function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("geral");

  return (
    <AppShell titulo="Configurações">
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--fx-border-subtle)" }}>
        {ABAS.map((a) => (
          <button
            key={a.value}
            onClick={() => setAba(a.value)}
            style={{
              background: "none",
              border: "none",
              borderBottom: aba === a.value ? "2px solid var(--fx-text-primary)" : "2px solid transparent",
              padding: "10px 14px",
              cursor: "pointer",
              font: "var(--fx-body)",
              fontWeight: aba === a.value ? 700 : 400,
              color: aba === a.value ? "var(--fx-text-primary)" : "var(--fx-text-tertiary)",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "geral" && <SecaoGeral />}
      {aba === "usuarios" && <SecaoUsuarios />}
      {aba === "terminais" && <SecaoTerminais />}
    </AppShell>
  );
}
