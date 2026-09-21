import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as conciliacaoApi from "@/api/conciliacao.api";
import type { ResultadoImportacao } from "@/api/conciliacao.api";

const CAMPOS_MAPEAVEIS: { chave: string; label: string; obrigatorio: boolean }[] = [
  { chave: "valorBruto", label: "Valor bruto", obrigatorio: true },
  { chave: "dataVenda", label: "Data da venda", obrigatorio: true },
  { chave: "dataPagamento", label: "Data de pagamento", obrigatorio: true },
  { chave: "nsu", label: "NSU", obrigatorio: false },
  { chave: "autorizacao", label: "Autorização", obrigatorio: false },
  { chave: "bandeira", label: "Bandeira", obrigatorio: false },
  { chave: "modalidade", label: "Modalidade", obrigatorio: false },
  { chave: "valorLiquido", label: "Valor líquido", obrigatorio: false },
  { chave: "valorTaxa", label: "Taxa", obrigatorio: false },
  { chave: "parcelas", label: "Parcelas", obrigatorio: false },
];

interface UploadExtratoProps {
  onImportado: () => void;
}

export function UploadExtrato({ onImportado }: UploadExtratoProps) {
  const { notificar } = useToast();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [adquirente, setAdquirente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});

  async function enviar() {
    if (!arquivo || !adquirente) {
      notificar("Selecione o arquivo e informe a adquirente.", "erro");
      return;
    }
    setEnviando(true);
    try {
      const r = await conciliacaoApi.importarExtrato(arquivo, adquirente);
      setResultado(r);
      if (r.status === "CONCLUIDO") {
        notificar(`Extrato importado: ${r.totalImportadas}/${r.totalLinhas} linhas.`, "sucesso");
        onImportado();
      } else if (!r.cabecalhosDisponiveis) {
        notificar(r.erro ?? "Não foi possível importar o extrato.", "erro");
      }
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarMapeamento() {
    if (!arquivo || !resultado) return;
    const faltando = CAMPOS_MAPEAVEIS.filter((c) => c.obrigatorio && !mapeamento[c.chave] && !resultado.mapeamentoSugerido?.[c.chave]);
    if (faltando.length > 0) {
      notificar(`Selecione a coluna para: ${faltando.map((f) => f.label).join(", ")}.`, "erro");
      return;
    }
    setEnviando(true);
    try {
      const mapeamentoFinal = { ...resultado.mapeamentoSugerido, ...mapeamento };
      const r = await conciliacaoApi.confirmarMapeamento(resultado.extratoId, arquivo, mapeamentoFinal);
      setResultado(r);
      if (r.status === "CONCLUIDO") {
        notificar(`Extrato importado: ${r.totalImportadas}/${r.totalLinhas} linhas.`, "sucesso");
        onImportado();
      }
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  const precisaMapeamentoManual = resultado?.status === "ERRO" && resultado.cabecalhosDisponiveis;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ font: "var(--fx-heading-4)" }}>Importar extrato da adquirente</span>
        <InfoTooltip texto="Aceita CSV com ';' ou ',' como separador, decimal com vírgula e datas dd/mm/aaaa. Reimportar o mesmo arquivo é bloqueado automaticamente." />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Input
          label="Adquirente"
          placeholder="Ex.: Cielo, Stone, Rede…"
          value={adquirente}
          onChange={(e) => setAdquirente(e.target.value)}
        />
        <div className="fx-field">
          <label>Arquivo CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="fx-input"
            style={{ padding: 6 }}
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button onClick={enviar} disabled={enviando}>
          {enviando ? "Importando…" : "Importar"}
        </Button>
      </div>

      {precisaMapeamentoManual && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--fx-border-subtle)", paddingTop: 16 }}>
          <p style={{ font: "var(--fx-body-sm)", color: "var(--fx-text-secondary)", margin: 0 }}>
            Não detectamos automaticamente todas as colunas obrigatórias. Confirme abaixo qual coluna do seu
            arquivo corresponde a cada campo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {CAMPOS_MAPEAVEIS.map((campo) => (
              <Select
                key={campo.chave}
                label={`${campo.label}${campo.obrigatorio ? " *" : ""}`}
                opcoes={[
                  { value: "", label: "—" },
                  ...(resultado!.cabecalhosDisponiveis ?? []).map((h) => ({ value: h, label: h })),
                ]}
                value={mapeamento[campo.chave] ?? resultado!.mapeamentoSugerido?.[campo.chave] ?? ""}
                onChange={(e) => setMapeamento((m) => ({ ...m, [campo.chave]: e.target.value }))}
              />
            ))}
          </div>
          <Button onClick={confirmarMapeamento} disabled={enviando}>
            {enviando ? "Processando…" : "Confirmar mapeamento e importar"}
          </Button>
        </div>
      )}
    </Card>
  );
}
