import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { BadgeClassificacao } from "@/components/ui/Badge";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDataHora } from "@/utils/formatDate";
import { usePermissao } from "@/hooks/usePermissao";
import type { ConciliacaoCartao, StatusConciliacaoMovimentacao } from "@/api/conciliacao.api";
import { ResolucaoManualModal } from "./ResolucaoManualModal";

const ROTULO_STATUS: Record<string, string> = {
  CONCILIADO: "Conciliado",
  DIVERGENTE: "Divergente",
  PENDENTE_REVISAO: "Pendente de revisão",
  SEM_EXTRATO: "Sem extrato",
  MANUAL: "Resolvido manualmente",
};

const CLASSIFICACAO_POR_STATUS: Record<string, "EXATO" | "SOBRA" | "FALTA"> = {
  CONCILIADO: "EXATO",
  MANUAL: "EXATO",
  DIVERGENTE: "FALTA",
  PENDENTE_REVISAO: "SOBRA",
  SEM_EXTRATO: "FALTA",
};

interface TabelaDivergenciasProps {
  registros: ConciliacaoCartao[];
  onAtualizar: () => void;
}

export function TabelaDivergencias({ registros, onAtualizar }: TabelaDivergenciasProps) {
  const { atende } = usePermissao();
  const [filtroStatus, setFiltroStatus] = useState<StatusConciliacaoMovimentacao | "">("");
  const [registroSelecionado, setRegistroSelecionado] = useState<ConciliacaoCartao | null>(null);

  const filtrados = filtroStatus ? registros.filter((r) => r.statusMovimentacao === filtroStatus) : registros;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <span style={{ font: "var(--fx-heading-4)" }}>Conciliações</span>
        <Select
          opcoes={[
            { value: "", label: "Todos os status" },
            { value: "CONCILIADO", label: "Conciliado" },
            { value: "DIVERGENTE", label: "Divergente" },
            { value: "PENDENTE_REVISAO", label: "Pendente de revisão" },
            { value: "SEM_EXTRATO", label: "Sem extrato" },
            { value: "MANUAL", label: "Resolvido manualmente" },
          ]}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusConciliacaoMovimentacao | "")}
          style={{ width: 220, maxWidth: "100%" }}
        />
      </div>

      <Table
        itens={filtrados}
        chaveItem={(r) => r.id}
        vazio="Nenhum registro de conciliação encontrado."
        colunas={[
          {
            chave: "venda",
            cabecalho: "Venda",
            render: (r) => (r.movimentacao ? `${formatarBRL(r.movimentacao.valor)} · ${r.movimentacao.formaPagamento}` : "-"),
          },
          {
            chave: "extrato",
            cabecalho: "Extrato",
            render: (r) => (r.transacaoExtrato ? `${formatarBRL(r.transacaoExtrato.valorBruto)} · NSU ${r.transacaoExtrato.nsu ?? "-"}` : "-"),
          },
          { chave: "diferenca", cabecalho: "Diferença", render: (r) => (r.diferencaValor ? formatarBRL(r.diferencaValor) : "-") },
          { chave: "nivel", cabecalho: "Confiança", render: (r) => (r.nivelConfianca ? `Nível ${r.nivelConfianca}` : "-") },
          {
            chave: "status",
            cabecalho: "Status",
            render: (r) => <BadgeClassificacao classificacao={CLASSIFICACAO_POR_STATUS[r.statusMovimentacao] ?? null} />,
          },
          {
            chave: "statusLabel",
            cabecalho: "",
            render: (r) => <span style={{ font: "var(--fx-caption)" }}>{ROTULO_STATUS[r.statusMovimentacao]}</span>,
          },
          { chave: "data", cabecalho: "Data", render: (r) => formatarDataHora(r.createdAt) },
          {
            chave: "acao",
            cabecalho: "",
            render: (r) =>
              atende("GERENTE") && r.statusMovimentacao !== "MANUAL" && r.statusMovimentacao !== "CONCILIADO" ? (
                <Button size="sm" variant="secondary" onClick={() => setRegistroSelecionado(r)}>
                  Resolver
                </Button>
              ) : null,
          },
        ]}
      />

      <ResolucaoManualModal
        registro={registroSelecionado}
        onFechar={() => setRegistroSelecionado(null)}
        onResolvido={onAtualizar}
      />
    </Card>
  );
}
