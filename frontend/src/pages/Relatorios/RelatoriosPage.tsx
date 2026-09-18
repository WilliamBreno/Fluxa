import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as relatoriosApi from "@/api/relatorios.api";
import { formatarBRL } from "@/utils/formatMoney";
import { usePermissao } from "@/hooks/usePermissao";
import { SecaoAuditoria } from "./components/SecaoAuditoria";

type AgruparPor = "operador" | "terminal" | "dia";

export function RelatoriosPage() {
  const [searchParams] = useSearchParams();
  const turnoIdRelatorio = searchParams.get("turnoId");
  const { notificar } = useToast();
  const { atende } = usePermissao();

  const [agruparPor, setAgruparPor] = useState<AgruparPor>("dia");
  const [comparativo, setComparativo] = useState<Awaited<ReturnType<typeof relatoriosApi.comparativo>>>([]);
  const [alertas, setAlertas] = useState<Awaited<ReturnType<typeof relatoriosApi.alertasDivergencia>>>([]);
  const [previsao, setPrevisao] = useState<Awaited<ReturnType<typeof relatoriosApi.previsaoCaixa>> | null>(null);
  const [dataInicioContabil, setDataInicioContabil] = useState("");
  const [dataFimContabil, setDataFimContabil] = useState("");

  useEffect(() => {
    relatoriosApi.comparativo({ agruparPor }).then(setComparativo).catch((err) => notificar(mensagemDeErro(err), "erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agruparPor]);

  useEffect(() => {
    relatoriosApi.alertasDivergencia().then(setAlertas).catch(() => undefined);
    if (atende("GERENTE")) {
      relatoriosApi.previsaoCaixa().then(setPrevisao).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportarContabil() {
    if (!dataInicioContabil || !dataFimContabil) {
      notificar("Informe o período para exportar.", "erro");
      return;
    }
    try {
      await relatoriosApi.baixarExportacaoContabil(dataInicioContabil, dataFimContabil);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  async function baixarFechamento(formato: "pdf" | "xlsx") {
    if (!turnoIdRelatorio) return;
    try {
      await relatoriosApi.baixarRelatorioFechamento(turnoIdRelatorio, formato);
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <AppShell titulo="Relatórios e auditoria">
      {turnoIdRelatorio && (
        <Card>
          <div style={{ font: "var(--fx-heading-4)", marginBottom: 8 }}>Relatório de fechamento do turno</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => baixarFechamento("pdf")}>
              Baixar PDF
            </Button>
            <Button variant="secondary" onClick={() => baixarFechamento("xlsx")}>
              Baixar Excel
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <span style={{ font: "var(--fx-heading-4)" }}>Comparativo de fechamentos</span>
          <Select
            opcoes={[
              { value: "dia", label: "Por dia" },
              { value: "operador", label: "Por operador" },
              { value: "terminal", label: "Por terminal" },
            ]}
            value={agruparPor}
            onChange={(e) => setAgruparPor(e.target.value as AgruparPor)}
            style={{ width: 180, maxWidth: "100%" }}
          />
        </div>
        <Table
          itens={comparativo}
          chaveItem={(c) => c.chave}
          colunas={[
            { chave: "chave", cabecalho: agruparPor === "dia" ? "Data" : agruparPor === "operador" ? "Operador" : "Terminal", render: (c) => c.chave },
            { chave: "turnos", cabecalho: "Turnos fechados", render: (c) => c.quantidadeTurnos },
            { chave: "divergencia", cabecalho: "Divergência total", render: (c) => formatarBRL(c.divergenciaTotal) },
            { chave: "comDivergencia", cabecalho: "Turnos com divergência", render: (c) => c.comDivergencia },
          ]}
        />
      </Card>

      <Card>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>
          Alertas de divergência recorrente (mesmo operador, últimos 60 dias)
        </div>
        <Table
          itens={alertas}
          chaveItem={(a) => a.operadorId}
          vazio="Nenhum padrão suspeito identificado."
          colunas={[
            { chave: "operador", cabecalho: "Operador", render: (a) => a.operadorNome },
            { chave: "ocorrencias", cabecalho: "Fechamentos com divergência", render: (a) => a.ocorrencias },
            { chave: "acumulada", cabecalho: "Divergência acumulada", render: (a) => formatarBRL(a.divergenciaAcumulada) },
          ]}
        />
      </Card>

      <SecaoAuditoria />

      {atende("GERENTE") && (
        <>
          {previsao && (
            <Card>
              <div style={{ font: "var(--fx-heading-4)", marginBottom: 8 }}>
                Previsão de caixa (média histórica dos últimos {previsao.baseDias} dias)
              </div>
              <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
                Saldo líquido médio diário: {formatarBRL(previsao.mediaDiariaHistorica)}
              </p>
              <Table
                itens={previsao.projecao}
                chaveItem={(p) => p.data}
                colunas={[
                  { chave: "data", cabecalho: "Data", render: (p) => p.data },
                  { chave: "saldo", cabecalho: "Saldo projetado", render: (p) => formatarBRL(p.saldoProjetado) },
                ]}
              />
            </Card>
          )}

          <Card>
            <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Exportação para contabilidade</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Input label="Data início" type="date" value={dataInicioContabil} onChange={(e) => setDataInicioContabil(e.target.value)} />
              <Input label="Data fim" type="date" value={dataFimContabil} onChange={(e) => setDataFimContabil(e.target.value)} />
              <Button onClick={exportarContabil}>Exportar Excel</Button>
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
