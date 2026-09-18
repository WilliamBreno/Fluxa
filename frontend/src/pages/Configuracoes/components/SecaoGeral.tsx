import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
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
          label="Teto de gaveta em dinheiro (R$)"
          ajuda="Quando o dinheiro em caixa ultrapassar esse valor, o operador recebe um alerta em tempo real sugerindo uma sangria — reduz o risco de assalto e facilita a conferência. Não bloqueia vendas, só avisa."
          type="number"
          step="0.01"
          value={config.tetoGavetaDinheiro}
          onChange={(e) => setConfig({ ...config, tetoGavetaDinheiro: e.target.value })}
        />
        <Input
          label="Tolerância de divergência no fechamento (R$)"
          ajuda="Diferença máxima (pra mais ou pra menos) entre o valor contado e o esperado que ainda é considerada 'exata'. Acima disso, o sistema exige que o operador explique a causa da divergência antes de confirmar o fechamento."
          type="number"
          step="0.01"
          value={config.toleranciaDivergencia}
          onChange={(e) => setConfig({ ...config, toleranciaDivergencia: e.target.value })}
        />
        <Input
          label="Valor mínimo para exigir conferência cruzada (R$)"
          ajuda="Sangrias e suprimentos acima desse valor ficam pendentes até uma segunda pessoa (diferente de quem lançou) confirmar — só depois disso entram no cálculo do caixa."
          type="number"
          step="0.01"
          value={config.valorMinimoConferenciaCruzada}
          onChange={(e) => setConfig({ ...config, valorMinimoConferenciaCruzada: e.target.value })}
        />
        <Input
          label="Horário do alerta de fechamento automático (HH:mm)"
          ajuda="Todo dia, nesse horário, o sistema avisa (sem fechar nada sozinho) se algum caixa continuar aberto — a menos que a opção abaixo esteja ativada."
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
          <InfoTooltip texto="Se ativado, o sistema fecha o caixa sozinho no horário configurado usando o valor que ele mesmo esperava — sem nenhuma contagem física real. O relatório deixa isso explícito. Só use como último recurso." />
        </label>
        <Input
          label="Dias de histórico para sugestão de fundo de troco"
          ajuda="Quantos dias de fechamentos anteriores o sistema olha para calcular a média sugerida na tela de abertura de caixa."
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
