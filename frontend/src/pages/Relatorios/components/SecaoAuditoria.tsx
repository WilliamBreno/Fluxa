import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as auditoriaApi from "@/api/auditoria.api";
import * as relatoriosApi from "@/api/relatorios.api";
import type { RegistroAuditoria } from "@/api/auditoria.api";
import { formatarDataHora } from "@/utils/formatDate";

const ROTULO_ACAO: Record<string, string> = {
  LOGIN: "Login",
  LOGIN_FALHO: "Tentativa de login falhou",
  ABERTURA_CAIXA: "Abertura de caixa",
  TENTATIVA_ABERTURA_DUPLICADA: "Tentativa de abertura duplicada",
  FECHAMENTO_CAIXA: "Fechamento de caixa",
  TROCA_OPERADOR: "Troca de operador",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento",
  CANCELAMENTO: "Cancelamento",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste",
  CONFERENCIA_CRUZADA: "Conferência cruzada",
  ALTERACAO_CONFIG: "Alteração de configuração",
  LEITURA_X: "Leitura X",
  ALERTA_TETO_GAVETA: "Alerta de teto de gaveta",
  FECHAMENTO_AUTOMATICO_ALERTA: "Alerta de fechamento não realizado",
  FECHAMENTO_AUTOMATICO_FORCADO: "Fechamento automático forçado",
  EXPORTACAO_RELATORIO: "Exportação de relatório",
  USUARIO_CRIADO: "Usuário criado",
  USUARIO_ATUALIZADO: "Usuário atualizado",
  IMPORTACAO_EXTRATO_CARTAO: "Importação de extrato de cartão",
  CONCILIACAO_EXECUTADA: "Conciliação de cartões executada",
  CONCILIACAO_RESOLVIDA_MANUAL: "Conciliação de cartão resolvida manualmente",
};

export function SecaoAuditoria() {
  const { notificar } = useToast();
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    auditoriaApi
      .listarAuditoria({ pagina })
      .then((r) => {
        setRegistros(r.itens);
        setTotal(r.total);
      })
      .catch((err) => notificar(mensagemDeErro(err), "erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  async function exportar() {
    try {
      await relatoriosApi.baixarAuditoriaCsv();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <span style={{ font: "var(--fx-heading-4)" }}>Log de auditoria (imutável) — {total} registro(s)</span>
        <Button variant="secondary" size="sm" onClick={exportar}>
          Exportar CSV
        </Button>
      </div>
      <Table
        itens={registros}
        chaveItem={(r) => r.id}
        colunas={[
          { chave: "data", cabecalho: "Data/hora", render: (r) => formatarDataHora(r.createdAt) },
          { chave: "acao", cabecalho: "Ação", render: (r) => ROTULO_ACAO[r.acao] ?? r.acao },
          { chave: "usuario", cabecalho: "Usuário", render: (r) => r.usuario?.nome ?? "Sistema" },
          { chave: "entidade", cabecalho: "Entidade", render: (r) => r.entidade },
        ]}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <button className="fx-btn fx-btn--secondary fx-btn--sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
          Anterior
        </button>
        <button className="fx-btn fx-btn--secondary fx-btn--sm" disabled={registros.length < 50} onClick={() => setPagina((p) => p + 1)}>
          Próxima
        </button>
      </div>
    </Card>
  );
}
