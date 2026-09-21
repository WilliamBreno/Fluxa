import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import { formatarDataHora } from "@/utils/formatDate";
import * as conciliacaoApi from "@/api/conciliacao.api";
import type { ConciliacaoCartao, ExtratoCartao, ResumoConciliacao as ResumoConciliacaoType } from "@/api/conciliacao.api";
import { UploadExtrato } from "./components/UploadExtrato";
import { TabelaDivergencias } from "./components/TabelaDivergencias";
import { ResumoConciliacao } from "./components/ResumoConciliacao";
import { AgendaRecebiveis } from "./components/AgendaRecebiveis";

type Aba = "importar" | "divergencias" | "resumo" | "recebiveis";

const ABAS: { value: Aba; label: string }[] = [
  { value: "importar", label: "Importar" },
  { value: "divergencias", label: "Divergências" },
  { value: "resumo", label: "Resumo" },
  { value: "recebiveis", label: "Recebíveis" },
];

export function ConciliacaoPage() {
  const { notificar } = useToast();
  const [aba, setAba] = useState<Aba>("importar");
  const [extratos, setExtratos] = useState<ExtratoCartao[]>([]);
  const [conciliacoes, setConciliacoes] = useState<ConciliacaoCartao[]>([]);
  const [resumo, setResumo] = useState<ResumoConciliacaoType | null>(null);
  const [dataInicioExec, setDataInicioExec] = useState("");
  const [dataFimExec, setDataFimExec] = useState("");
  const [executando, setExecutando] = useState(false);

  async function carregarTudo() {
    try {
      const [ex, co, re] = await Promise.all([
        conciliacaoApi.listarExtratos(),
        conciliacaoApi.listarConciliacoes(),
        conciliacaoApi.resumoConciliacao(),
      ]);
      setExtratos(ex);
      setConciliacoes(co);
      setResumo(re);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executarConciliacao() {
    if (!dataInicioExec || !dataFimExec) {
      notificar("Informe o período para executar a conciliação.", "erro");
      return;
    }
    setExecutando(true);
    try {
      const resultado = await conciliacaoApi.executarConciliacao(dataInicioExec, dataFimExec);
      notificar(
        `Conciliação executada: ${resultado.conciliadasNivel1 + resultado.conciliadasNivel2} conciliadas, ${resultado.pendentesRevisao} pendentes de revisão.`,
        "sucesso"
      );
      carregarTudo();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setExecutando(false);
    }
  }

  return (
    <AppShell titulo="Conciliação de cartões">
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

      {aba === "importar" && (
        <>
          <UploadExtrato onImportado={carregarTudo} />
          <Card>
            <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Extratos importados</div>
            <Table
              itens={extratos}
              chaveItem={(e) => e.id}
              vazio="Nenhum extrato importado ainda."
              colunas={[
                { chave: "arquivo", cabecalho: "Arquivo", render: (e) => e.nomeArquivo },
                { chave: "adquirente", cabecalho: "Adquirente", render: (e) => e.adquirente },
                {
                  chave: "status",
                  cabecalho: "Status",
                  render: (e) => (
                    <Badge variant={e.status === "CONCLUIDO" ? "success" : e.status === "ERRO" ? "danger" : "warning"}>
                      {e.status}
                    </Badge>
                  ),
                },
                { chave: "linhas", cabecalho: "Linhas importadas", render: (e) => `${e.totalImportadas}/${e.totalLinhas}` },
                { chave: "importadoPor", cabecalho: "Importado por", render: (e) => e.importadoPor.nome },
                { chave: "data", cabecalho: "Data", render: (e) => formatarDataHora(e.createdAt) },
              ]}
            />
          </Card>
        </>
      )}

      {aba === "divergencias" && (
        <>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ font: "var(--fx-heading-4)" }}>Executar conciliação</span>
              <InfoTooltip texto="Compara as vendas em cartão do período com as transações dos extratos já importados. Só concilia automaticamente quando há exatamente 1 candidato — casos ambíguos ficam pendentes de revisão manual." />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Input label="Data início" type="date" value={dataInicioExec} onChange={(e) => setDataInicioExec(e.target.value)} />
              <Input label="Data fim" type="date" value={dataFimExec} onChange={(e) => setDataFimExec(e.target.value)} />
              <Button onClick={executarConciliacao} disabled={executando}>
                {executando ? "Executando…" : "Executar conciliação"}
              </Button>
            </div>
          </Card>
          <TabelaDivergencias registros={conciliacoes} onAtualizar={carregarTudo} />
        </>
      )}

      {aba === "resumo" && resumo && <ResumoConciliacao resumo={resumo} />}

      {aba === "recebiveis" && <AgendaRecebiveis />}
    </AppShell>
  );
}
