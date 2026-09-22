import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatarDataHora } from "@/utils/formatDate";
import * as notificacoesApi from "@/api/notificacoes.api";
import type { Notificacao, SeveridadeNotificacao } from "@/api/notificacoes.api";

const COR_SEVERIDADE: Record<SeveridadeNotificacao, string> = {
  INFO: "var(--fx-text-tertiary)",
  ATENCAO: "var(--fx-color-warning)",
  URGENTE: "var(--fx-color-danger)",
};

export function NotificacoesBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    notificacoesApi
      .listar()
      .then(setNotificacoes)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  useSocketEvent<Notificacao>("notificacao:nova", (nova) => {
    setNotificacoes((atual) => [nova, ...atual]);
  });

  const naoLidas = notificacoes.filter((n) => !n.lidaEm).length;

  async function handleMarcarLida(id: string) {
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lidaEm: new Date().toISOString() } : n)));
    await notificacoesApi.marcarComoLida(id);
  }

  async function handleMarcarTodasLidas() {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lidaEm: n.lidaEm ?? new Date().toISOString() })));
    await notificacoesApi.marcarTodasComoLidas();
  }

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        aria-label={naoLidas > 0 ? `${naoLidas} notificações não lidas` : "Sem notificações novas"}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          border: "none",
          borderRadius: "var(--fx-radius-control)",
          background: "transparent",
          color: "var(--fx-text-secondary)",
          cursor: "pointer",
        }}
      >
        <Bell size={18} strokeWidth={2} />
        {naoLidas > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--fx-color-danger)",
            }}
          />
        )}
      </button>

      <Modal aberto={modalAberto} titulo="Notificações" onFechar={() => setModalAberto(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {naoLidas > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarcarTodasLidas}>
              Marcar todas como lidas
            </Button>
          )}

          {carregando && <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>Carregando…</p>}
          {!carregando && notificacoes.length === 0 && (
            <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
              Nenhuma notificação por aqui — tudo em dia.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
            {notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.lidaEm && handleMarcarLida(n.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--fx-border-subtle)",
                  borderLeft: `3px solid ${COR_SEVERIDADE[n.severidade]}`,
                  borderRadius: "var(--fx-radius-control)",
                  padding: 10,
                  background: n.lidaEm ? "transparent" : "var(--fx-surface-hover)",
                  cursor: n.lidaEm ? "default" : "pointer",
                }}
              >
                <div style={{ font: "var(--fx-body-sm)", fontWeight: 600 }}>{n.titulo}</div>
                <div style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)" }}>{n.mensagem}</div>
                <div className="fx-overline" style={{ marginTop: 4 }}>
                  {formatarDataHora(n.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
