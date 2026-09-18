import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDataHora } from "@/utils/formatDate";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as movimentacoesApi from "@/api/movimentacoes.api";
import type { Movimentacao } from "@/api/movimentacoes.api";
import { usePermissao } from "@/hooks/usePermissao";

const ROTULO_TIPO: Record<string, string> = {
  VENDA: "Venda",
  SANGRIA: "Sangria",
  SUPRIMENTO: "Suprimento",
  CANCELAMENTO: "Cancelamento",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste",
};

interface ListaMovimentacoesTurnoProps {
  movimentacoes: Movimentacao[];
  onAtualizar: () => void;
}

export function ListaMovimentacoesTurno({ movimentacoes, onAtualizar }: ListaMovimentacoesTurnoProps) {
  const { notificar } = useToast();
  const { atende } = usePermissao();

  async function conferir(id: string) {
    try {
      await movimentacoesApi.conferirMovimentacao(id);
      notificar("Movimentação conferida.", "sucesso");
      onAtualizar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <Card>
      <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Movimentações do turno</div>
      <Table
        itens={movimentacoes}
        chaveItem={(m) => m.id}
        colunas={[
          { chave: "tipo", cabecalho: "Tipo", render: (m) => ROTULO_TIPO[m.tipo] ?? m.tipo },
          { chave: "forma", cabecalho: "Forma", render: (m) => m.formaPagamento ?? "-" },
          { chave: "valor", cabecalho: "Valor", render: (m) => formatarBRL(m.valor) },
          { chave: "operador", cabecalho: "Operador", render: (m) => m.operador.nome },
          { chave: "hora", cabecalho: "Hora", render: (m) => formatarDataHora(m.createdAt) },
          {
            chave: "status",
            cabecalho: "Status",
            render: (m) => {
              if (m.status === "ESTORNADA") return <Badge variant="danger">Estornada</Badge>;
              if (m.status === "PENDENTE_CONFERENCIA") {
                return atende("SUPERVISOR") ? (
                  <Button size="sm" variant="secondary" onClick={() => conferir(m.id)}>
                    Conferir
                  </Button>
                ) : (
                  <Badge variant="warning">Aguardando conferência</Badge>
                );
              }
              return <Badge variant="success">Ativa</Badge>;
            },
          },
        ]}
      />
    </Card>
  );
}
