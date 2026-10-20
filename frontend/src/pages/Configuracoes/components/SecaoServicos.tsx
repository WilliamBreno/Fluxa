import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as servicosApi from "@/api/servicos.api";
import type { Servico } from "@/api/servicos.api";
import { formatarBRL } from "@/utils/formatMoney";
import { formatarDuracao } from "@/utils/agenda";

// Cores dos blocos na agenda: a paleta de gráficos do design system, mais dois neutros
// distinguíveis. Ficam restritas ao bloco do serviço, nunca viram cor de interface.
const PALETA = ["#2a78d6", "#1baf7a", "#eda100", "#eb6834", "#e87ba4", "#0f9fb5", "#8a8f98"];
const DURACOES = [10, 15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180, 240];

interface FormServico {
  nome: string;
  duracaoMinutos: number;
  preco: string;
  cor: string;
}

const FORM_VAZIO: FormServico = { nome: "", duracaoMinutos: 30, preco: "", cor: PALETA[0] };

export function SecaoServicos() {
  const { notificar } = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [form, setForm] = useState<FormServico>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    servicosApi.listarServicos(true).then(setServicos).catch((err) => notificar(mensagemDeErro(err), "erro"));
  }

  useEffect(carregar, []); // eslint-disable-line react-hooks/exhaustive-deps

  function editar(s: Servico) {
    setEditandoId(s.id);
    setForm({ nome: s.nome, duracaoMinutos: s.duracaoMinutos, preco: Number(s.preco).toFixed(2), cor: s.cor });
  }

  function limpar() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const payload = { ...form, preco: Number(form.preco.replace(",", ".") || 0) };
    try {
      if (editandoId) await servicosApi.atualizarServico(editandoId, payload);
      else await servicosApi.criarServico(payload);
      notificar(editandoId ? "Serviço atualizado." : "Serviço criado.", "sucesso");
      limpar();
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function alternarAtivo(s: Servico) {
    try {
      await servicosApi.atualizarServico(s.id, { ativo: !s.ativo });
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  const opcoesDuracao = (DURACOES.includes(form.duracaoMinutos) ? DURACOES : [...DURACOES, form.duracaoMinutos].sort((a, b) => a - b)).map(
    (d) => ({ value: String(d), label: formatarDuracao(d) })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 560 }}>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 4 }}>{editandoId ? "Editar serviço" : "Novo serviço"}</div>
        <p style={{ margin: "0 0 12px", font: "var(--fx-body-sm)", color: "var(--fx-text-tertiary)" }}>
          A duração e o preço preenchem o agendamento automaticamente. Alterar o preço não muda agendamentos já marcados.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <div className="fx-form-grid">
            <Select
              label="Duração"
              opcoes={opcoesDuracao}
              value={String(form.duracaoMinutos)}
              onChange={(e) => setForm({ ...form, duracaoMinutos: Number(e.target.value) })}
            />
            <Input
              label="Preço (R$)"
              inputMode="decimal"
              placeholder="0,00"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value.replace(/[^\d.,]/g, "") })}
            />
          </div>
          <div className="fx-field">
            <label id="cor-servico">Cor na agenda</label>
            <div className="fx-paleta" role="group" aria-labelledby="cor-servico">
              {PALETA.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={`Cor ${cor}`}
                  aria-pressed={form.cor === cor}
                  style={{ background: cor }}
                  onClick={() => setForm({ ...form, cor })}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" disabled={enviando || form.nome.trim().length < 2}>
              {enviando ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar serviço"}
            </Button>
            {editandoId && (
              <Button type="button" variant="secondary" onClick={limpar}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Catálogo de serviços</div>
        {servicos.length === 0 ? (
          <p style={{ color: "var(--fx-text-tertiary)", padding: "16px 0", textAlign: "center", margin: 0 }}>
            Nenhum serviço cadastrado. Dá para agendar sem serviço, mas sem duração e preço automáticos.
          </p>
        ) : (
          <div className="fx-table-scroll">
            <table className="fx-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Duração</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id} style={{ opacity: s.ativo ? 1 : 0.6 }}>
                    <td>
                      <span className="fx-chip-servico" style={{ ["--fx-evento-cor" as string]: s.cor, fontWeight: 600 }}>
                        <span>{s.nome}</span>
                      </span>
                    </td>
                    <td>{formatarDuracao(s.duracaoMinutos)}</td>
                    <td>{formatarBRL(s.preco)}</td>
                    <td>{s.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button size="sm" variant="ghost" onClick={() => editar(s)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => alternarAtivo(s)}>
                        {s.ativo ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
