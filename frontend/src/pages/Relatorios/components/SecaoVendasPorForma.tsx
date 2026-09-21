import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { formatarBRL } from "@/utils/formatMoney";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as relatoriosApi from "@/api/relatorios.api";
import type { VendaPorFormaPeriodo } from "@/api/relatorios.api";

const FORMAS = ["DINHEIRO", "DEBITO", "CREDITO", "PIX", "VALE", "FIADO", "OUTRO"] as const;

export function SecaoVendasPorForma() {
  const { notificar } = useToast();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [agrupamento, setAgrupamento] = useState<"hora" | "dia">("dia");
  const [linhas, setLinhas] = useState<VendaPorFormaPeriodo[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    if (!dataInicio || !dataFim) {
      notificar("Informe o período.", "erro");
      return;
    }
    setCarregando(true);
    try {
      setLinhas(await relatoriosApi.vendasPorForma({ dataInicio, dataFim, agrupamento }));
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function exportar() {
    if (!dataInicio || !dataFim) return;
    try {
      await relatoriosApi.baixarVendasPorForma({ dataInicio, dataFim, agrupamento });
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <Card>
      <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Vendas por forma de pagamento</div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <Input label="Data início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Data fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Select
          label="Agrupar por"
          opcoes={[
            { value: "dia", label: "Dia" },
            { value: "hora", label: "Hora" },
          ]}
          value={agrupamento}
          onChange={(e) => setAgrupamento(e.target.value as "hora" | "dia")}
        />
        <Button onClick={consultar} disabled={carregando}>
          {carregando ? "Consultando…" : "Consultar"}
        </Button>
        {linhas && linhas.length > 0 && (
          <Button variant="secondary" onClick={exportar}>
            Exportar CSV
          </Button>
        )}
      </div>

      {linhas && (
        <Table
          itens={linhas}
          chaveItem={(l) => l.periodo}
          vazio="Nenhuma venda no período consultado."
          colunas={[
            { chave: "periodo", cabecalho: "Período", render: (l) => l.periodo },
            { chave: "quantidade", cabecalho: "Qtde.", render: (l) => l.quantidade },
            { chave: "total", cabecalho: "Total", render: (l) => formatarBRL(l.total) },
            ...FORMAS.map((forma) => ({
              chave: forma,
              cabecalho: forma,
              render: (l: VendaPorFormaPeriodo) => formatarBRL(l.porForma[forma] ?? "0"),
            })),
          ]}
        />
      )}
    </Card>
  );
}
