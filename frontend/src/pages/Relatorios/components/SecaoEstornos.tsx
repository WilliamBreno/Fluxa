import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDataHora } from "@/utils/formatDate";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as relatoriosApi from "@/api/relatorios.api";
import type { EstornoRelatorio } from "@/api/relatorios.api";

export function SecaoEstornos() {
  const { notificar } = useToast();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [linhas, setLinhas] = useState<EstornoRelatorio[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    setCarregando(true);
    try {
      setLinhas(await relatoriosApi.estornosRelatorio({ dataInicio: dataInicio || undefined, dataFim: dataFim || undefined }));
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function exportar() {
    try {
      await relatoriosApi.baixarEstornosRelatorio({ dataInicio: dataInicio || undefined, dataFim: dataFim || undefined });
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <Card>
      <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Cancelamentos e devoluções</div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <Input label="Data início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Data fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
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
          chaveItem={(l) => l.id}
          vazio="Nenhum estorno no período consultado."
          colunas={[
            { chave: "data", cabecalho: "Data/hora", render: (l) => formatarDataHora(l.createdAt) },
            { chave: "tipo", cabecalho: "Tipo", render: (l) => (l.tipo === "CANCELAMENTO" ? "Cancelamento" : "Devolução") },
            { chave: "valor", cabecalho: "Valor", render: (l) => formatarBRL(l.valor) },
            { chave: "operador", cabecalho: "Operador", render: (l) => l.operador.nome },
            { chave: "motivo", cabecalho: "Motivo", render: (l) => l.motivo ?? "-" },
            {
              chave: "vendaOriginal",
              cabecalho: "Venda original",
              render: (l) => (l.vendaReferencia ? `${formatarBRL(l.vendaReferencia.valor)} (${l.vendaReferencia.formaPagamento})` : "-"),
            },
          ]}
        />
      )}
    </Card>
  );
}
