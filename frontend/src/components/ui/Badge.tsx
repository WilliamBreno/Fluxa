import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "success" | "danger" | "warning" | "neutral";
  children: ReactNode;
}

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return <span className={`fx-badge fx-badge--${variant}`}>{children}</span>;
}

const CLASSIFICACAO_VARIANTE: Record<string, BadgeProps["variant"]> = {
  EXATO: "success",
  SOBRA: "warning",
  FALTA: "danger",
};

export function BadgeClassificacao({ classificacao }: { classificacao: string | null | undefined }) {
  if (!classificacao) return <Badge variant="neutral">—</Badge>;
  const rotulo = { EXATO: "Exato", SOBRA: "Sobra", FALTA: "Falta" }[classificacao] ?? classificacao;
  return <Badge variant={CLASSIFICACAO_VARIANTE[classificacao] ?? "neutral"}>{rotulo}</Badge>;
}
