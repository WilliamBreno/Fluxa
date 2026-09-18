import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import * as terminaisApi from "@/api/terminais.api";
import type { Terminal } from "@/api/terminais.api";
import { formatarDataHora } from "@/utils/formatDate";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";

export function TerminaisPage() {
  const navigate = useNavigate();
  const { notificar } = useToast();
  const [terminais, setTerminais] = useState<Terminal[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    terminaisApi
      .listarTerminais()
      .then(setTerminais)
      .catch((err) => notificar(mensagemDeErro(err), "erro"))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirTerminal(terminal: Terminal) {
    const turnoAberto = terminal.turnos[0];
    if (turnoAberto) {
      navigate(`/operacao/${turnoAberto.id}`);
    } else {
      navigate(`/abertura/${terminal.id}`);
    }
  }

  return (
    <AppShell titulo="Selecione o caixa">
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {terminais.map((terminal) => {
            const turnoAberto = terminal.turnos[0];
            return (
              <Card key={terminal.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ font: "var(--fx-heading-4)" }}>{terminal.nome}</div>
                    <div className="fx-overline">Código {terminal.codigo}</div>
                  </div>
                  {turnoAberto ? (
                    <Badge variant="success">Aberto</Badge>
                  ) : (
                    <Badge variant="neutral">Fechado</Badge>
                  )}
                </div>

                {turnoAberto ? (
                  <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", margin: 0 }}>
                    Responsável: {turnoAberto.operadorResponsavelAtual.nome}
                    <br />
                    Desde {formatarDataHora(turnoAberto.dataAbertura)}
                  </p>
                ) : (
                  <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", margin: 0 }}>
                    Nenhum turno aberto neste caixa.
                  </p>
                )}

                <Button onClick={() => abrirTerminal(terminal)} variant={turnoAberto ? "secondary" : "primary"}>
                  {turnoAberto ? "Continuar operação" : "Abrir caixa"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
