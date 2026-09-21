import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarData } from "@/utils/formatDate";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as conciliacaoApi from "@/api/conciliacao.api";

export function AgendaRecebiveis() {
  const { notificar } = useToast();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [linhas, setLinhas] = useState<{ data: string; valorPrevisto: string; quantidade: number }[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function consultar() {
    if (!dataInicio || !dataFim) {
      notificar("Informe o período.", "erro");
      return;
    }
    setCarregando(true);
    try {
      setLinhas(await conciliacaoApi.agendaRecebiveis(dataInicio, dataFim));
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setCarregando(false);
    }
  }

  const total = linhas?.reduce((acc, l) => acc + Number(l.valorPrevisto), 0) ?? 0;

  return (
    <Card>
      <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Agenda de recebíveis</div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <Input label="Data início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Data fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        <Button onClick={consultar} disabled={carregando}>
          {carregando ? "Consultando…" : "Consultar"}
        </Button>
      </div>

      {linhas && (
        <>
          <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)" }}>
            Total previsto no período: <strong>{formatarBRL(total)}</strong>
          </p>
          <Table
            itens={linhas}
            chaveItem={(l) => l.data}
            vazio="Nenhum recebível previsto no período."
            colunas={[
              { chave: "data", cabecalho: "Data prevista", render: (l) => formatarData(l.data) },
              { chave: "quantidade", cabecalho: "Qtde. transações", render: (l) => l.quantidade },
              { chave: "valor", cabecalho: "Valor previsto", render: (l) => formatarBRL(l.valorPrevisto) },
            ]}
          />
        </>
      )}
    </Card>
  );
}
