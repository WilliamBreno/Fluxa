import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as configuracoesApi from "@/api/configuracoes.api";
import type { ConfiguracaoLoja } from "@/api/configuracoes.api";

export function SecaoGeral() {
  const { notificar } = useToast();
  const [config, setConfig] = useState<ConfiguracaoLoja | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [emailsTexto, setEmailsTexto] = useState("");

  useEffect(() => {
    configuracoesApi.obterConfiguracao().then((c) => {
      setConfig(c);
      setEmailsTexto(c.emailsGestorResumoDiario.join(", "));
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSalvando(true);
    try {
      const atualizado = await configuracoesApi.atualizarConfiguracao({
        ...config,
        emailsGestorResumoDiario: emailsTexto
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setConfig(atualizado);
      notificar("Configurações salvas.", "sucesso");
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setSalvando(false);
    }
  }

  if (!config) return <p>Carregando…</p>;

  return (
    <Card style={{ maxWidth: 560 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input
          label="Teto de gaveta em dinheiro (R$) — sugere sangria acima deste valor"
          type="number"
          step="0.01"
          value={config.tetoGavetaDinheiro}
          onChange={(e) => setConfig({ ...config, tetoGavetaDinheiro: e.target.value })}
        />
        <Input
          label="Tolerância de divergência no fechamento (R$)"
          type="number"
          step="0.01"
          value={config.toleranciaDivergencia}
          onChange={(e) => setConfig({ ...config, toleranciaDivergencia: e.target.value })}
        />
        <Input
          label="Valor mínimo para exigir conferência cruzada (R$)"
          type="number"
          step="0.01"
          value={config.valorMinimoConferenciaCruzada}
          onChange={(e) => setConfig({ ...config, valorMinimoConferenciaCruzada: e.target.value })}
        />
        <Input
          label="Horário do alerta de fechamento automático (HH:mm)"
          value={config.horaFechamentoAutomatico}
          onChange={(e) => setConfig({ ...config, horaFechamentoAutomatico: e.target.value })}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--fx-body-sm)" }}>
          <input
            type="checkbox"
            checked={config.fecharAutomaticamenteSemContagem}
            onChange={(e) => setConfig({ ...config, fecharAutomaticamenteSemContagem: e.target.checked })}
          />
          Forçar fechamento automático sem contagem física quando ninguém fechar (não recomendado)
        </label>
        <Input
          label="Dias de histórico para sugestão de fundo de troco"
          type="number"
          value={config.diasHistoricoMediaTroco}
          onChange={(e) => setConfig({ ...config, diasHistoricoMediaTroco: Number(e.target.value) })}
        />
        <Input
          label="E-mails do gestor para resumo diário (separados por vírgula)"
          value={emailsTexto}
          onChange={(e) => setEmailsTexto(e.target.value)}
          placeholder="gestor@empresa.com, socio@empresa.com"
        />
        <p style={{ font: "var(--fx-caption)", color: "var(--fx-text-tertiary)" }}>
          O envio real de e-mail ainda não está conectado a um provedor nesta versão — os resumos ficam
          registrados no sistema, prontos para quando um SMTP for configurado.
        </p>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar configurações"}
        </Button>
      </form>
    </Card>
  );
}
