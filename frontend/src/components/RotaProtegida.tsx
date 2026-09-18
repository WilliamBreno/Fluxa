import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissao } from "@/hooks/usePermissao";

interface RotaProtegidaProps {
  children: ReactNode;
  minimo?: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN";
}

export function RotaProtegida({ children, minimo }: RotaProtegidaProps) {
  const { usuario, carregando } = useAuth();
  const { atende } = usePermissao();

  if (carregando) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        Carregando…
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;
  if (minimo && !atende(minimo)) return <Navigate to="/terminais" replace />;

  return <>{children}</>;
}
