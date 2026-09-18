import { Navigate, Route, Routes } from "react-router-dom";
import { RotaProtegida } from "@/components/RotaProtegida";
import { LoginPage } from "@/pages/Login/LoginPage";
import { TerminaisPage } from "@/pages/Terminais/TerminaisPage";
import { AberturaCaixaPage } from "@/pages/Abertura/AberturaCaixaPage";
import { OperacaoCaixaPage } from "@/pages/Operacao/OperacaoCaixaPage";
import { FechamentoCaixaPage } from "@/pages/Fechamento/FechamentoCaixaPage";
import { LeituraXPage } from "@/pages/LeituraX/LeituraXPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { RelatoriosPage } from "@/pages/Relatorios/RelatoriosPage";
import { ConfiguracoesPage } from "@/pages/Configuracoes/ConfiguracoesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/terminais"
        element={
          <RotaProtegida>
            <TerminaisPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/abertura/:terminalId"
        element={
          <RotaProtegida>
            <AberturaCaixaPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/operacao/:turnoId"
        element={
          <RotaProtegida>
            <OperacaoCaixaPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/operacao/:turnoId/fechamento"
        element={
          <RotaProtegida>
            <FechamentoCaixaPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/operacao/:turnoId/leitura-x"
        element={
          <RotaProtegida>
            <LeituraXPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RotaProtegida minimo="SUPERVISOR">
            <DashboardPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/relatorios"
        element={
          <RotaProtegida minimo="SUPERVISOR">
            <RelatoriosPage />
          </RotaProtegida>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <RotaProtegida minimo="GERENTE">
            <ConfiguracoesPage />
          </RotaProtegida>
        }
      />

      <Route path="/" element={<Navigate to="/terminais" replace />} />
      <Route path="*" element={<Navigate to="/terminais" replace />} />
    </Routes>
  );
}
