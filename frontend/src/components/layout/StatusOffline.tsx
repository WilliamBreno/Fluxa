import { useState } from "react";
import { CloudOff, Loader2, RefreshCw, X } from "lucide-react";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatarDataHora } from "@/utils/formatDate";
import { usePermissao } from "@/hooks/usePermissao";

const ROTULO_TIPO: Record<string, string> = {
  VENDA: "Venda",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento",
};

export function StatusOffline() {
  const { online, sincronizando, pendentes, rejeitadas, removerRejeitada } = useOfflineStatus();
  const { atende } = usePermissao();
  const [modalAberto, setModalAberto] = useState(false);

  if (online && pendentes === 0 && rejeitadas.length === 0 && !sincronizando) {
    return null;
  }

  const corFundo = !online
    ? "var(--fx-color-warning-bg)"
    : rejeitadas.length > 0
      ? "var(--fx-color-danger-bg)"
      : "var(--fx-surface-hover)";
  const corTexto = !online ? "var(--fx-color-warning)" : rejeitadas.length > 0 ? "var(--fx-color-danger)" : "var(--fx-text-secondary)";

  let texto = "Online";
  if (!online) texto = "Offline";
  else if (sincronizando) texto = "Sincronizando…";
  else if (pendentes > 0) texto = `${pendentes} pendente(s)`;
  if (rejeitadas.length > 0) texto += ` · ${rejeitadas.length} rejeitada(s)`;

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: "var(--fx-radius-pill)",
          border: "none",
          background: corFundo,
          color: corTexto,
          font: "var(--fx-caption)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {!online ? <CloudOff size={13} /> : sincronizando ? <Loader2 size={13} className="fx-spin" /> : <RefreshCw size={13} />}
        {texto}
      </button>

      <Modal aberto={modalAberto} titulo="Sincronização" onFechar={() => setModalAberto(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", margin: 0 }}>
            {online
              ? "Conectado. Vendas, sangrias e suprimentos lançados enquanto estava offline são enviados automaticamente."
              : "Sem conexão agora — vendas, sangrias e suprimentos continuam sendo registrados localmente e serão enviados assim que a internet voltar."}
          </p>

          {pendentes > 0 && (
            <div>
              <div className="fx-overline">Pendentes de envio</div>
              <div style={{ font: "var(--fx-heading-3)" }}>{pendentes}</div>
            </div>
          )}

          {rejeitadas.length > 0 && (
            <div>
              <div className="fx-overline" style={{ marginBottom: 8 }}>
                Rejeitadas pelo servidor (precisam de atenção)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rejeitadas.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid var(--fx-border-subtle)",
                      borderRadius: "var(--fx-radius-control)",
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ font: "var(--fx-body-sm)", fontWeight: 600 }}>
                        {ROTULO_TIPO[r.payload.tipo] ?? r.payload.tipo} — R$ {r.payload.valor.toFixed(2)}
                      </div>
                      <div style={{ font: "var(--fx-caption)", color: "var(--fx-color-danger)" }}>{r.motivoRejeicao}</div>
                      <div className="fx-overline">Lançado em {formatarDataHora(new Date(r.criadaEm))}</div>
                    </div>
                    {atende("SUPERVISOR") && (
                      <button
                        onClick={() => removerRejeitada(r.id)}
                        aria-label="Descartar"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fx-text-tertiary)" }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)", marginTop: 8 }}>
                Itens rejeitados nunca são reenviados sozinhos — lance manualmente de novo se ainda for válido.
              </p>
            </div>
          )}

          <Button variant="secondary" onClick={() => setModalAberto(false)}>
            Fechar
          </Button>
        </div>
      </Modal>
    </>
  );
}
