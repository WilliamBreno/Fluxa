import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { BadgeClassificacao } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatarBRL } from "@/utils/formatMoney";
import type { FechamentoCaixa } from "@/api/fechamento.api";

const ROTULO_FORMA: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  PIX: "Pix",
  VALE: "Vale",
  FIADO: "Fiado",
  OUTRO: "Outro",
};

interface EtapaDivergenciaProps {
  fechamento: FechamentoCaixa;
  onContinuar: () => void;
}

export function EtapaDivergencia({ fechamento, onContinuar }: EtapaDivergenciaProps) {
  return (
    <Card style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ font: "var(--fx-heading-3)" }}>Divergência calculada</div>
        <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)", margin: "4px 0 0" }}>
          Este é o resultado da comparação entre o que você contou e o que o sistema esperava, com base nas
          movimentações registradas no turno.
        </p>
      </div>

      <Table
        itens={fechamento.contagens}
        chaveItem={(c) => c.formaPagamento}
        colunas={[
          { chave: "forma", cabecalho: "Forma", render: (c) => ROTULO_FORMA[c.formaPagamento] ?? c.formaPagamento },
          { chave: "contado", cabecalho: "Contado", render: (c) => formatarBRL(c.valorContado) },
          { chave: "esperado", cabecalho: "Esperado", render: (c) => (c.valorEsperado ? formatarBRL(c.valorEsperado) : "-") },
          { chave: "divergencia", cabecalho: "Divergência", render: (c) => (c.divergencia ? formatarBRL(c.divergencia) : "-") },
          { chave: "classificacao", cabecalho: "Status", render: (c) => <BadgeClassificacao classificacao={c.classificacao} /> },
        ]}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTop: "1px solid var(--fx-border-subtle)",
        }}
      >
        <div>
          <div className="fx-overline">Divergência total</div>
          <div style={{ font: "var(--fx-heading-2)" }}>
            {fechamento.divergenciaTotal ? formatarBRL(fechamento.divergenciaTotal) : "-"}
          </div>
        </div>
        <BadgeClassificacao classificacao={fechamento.classificacaoGeral} />
      </div>

      <Button onClick={onContinuar}>Continuar para confirmação</Button>
    </Card>
  );
}
