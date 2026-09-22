import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as planosApi from "@/api/planos.api";
import type { Plano } from "@/api/planos.api";

interface FormState {
  id?: string;
  nome: string;
  descricao: string;
  valorMensal: string;
  valorAnual: string;
  limiteTerminais: string;
  ordem: string;
  funcionalidades: string;
  ativo: boolean;
}

const FORM_VAZIO: FormState = {
  nome: "",
  descricao: "",
  valorMensal: "",
  valorAnual: "",
  limiteTerminais: "",
  ordem: "0",
  funcionalidades: "",
  ativo: true,
};

function planoParaForm(p: Plano): FormState {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? "",
    valorMensal: p.valorMensal,
    valorAnual: p.valorAnual,
    limiteTerminais: p.limiteTerminais?.toString() ?? "",
    ordem: p.ordem.toString(),
    funcionalidades: p.funcionalidades.join("\n"),
    ativo: p.ativo,
  };
}

export function PlanosAdminPage() {
  const { notificar } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    planosApi.listarAdmin().then(setPlanos).catch((err) => notificar(mensagemDeErro(err), "erro"));
  }

  useEffect(carregar, []);

  async function handleSalvar() {
    if (!form) return;
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || undefined,
        valorMensal: Number(form.valorMensal.replace(",", ".")),
        valorAnual: Number(form.valorAnual.replace(",", ".")),
        limiteTerminais: form.limiteTerminais ? Number(form.limiteTerminais) : null,
        ordem: Number(form.ordem),
        funcionalidades: form.funcionalidades.split("\n").map((f) => f.trim()).filter(Boolean),
        ativo: form.ativo,
      };
      if (form.id) {
        await planosApi.atualizar(form.id, payload);
      } else {
        await planosApi.criar(payload);
      }
      notificar("Plano salvo.", "sucesso");
      setForm(null);
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!confirm("Desativar este plano? Ele deixa de aparecer na tela de seleção.")) return;
    await planosApi.remover(id);
    carregar();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ font: "var(--fx-heading-2)" }}>Planos</div>
        <Button onClick={() => setForm(FORM_VAZIO)}>
          <Plus size={16} /> Novo plano
        </Button>
      </div>

      <div className="fx-table-scroll">
        <table className="fx-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Mensal</th>
              <th>Anual</th>
              <th>Limite terminais</th>
              <th>Ordem</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {planos.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>R$ {Number(p.valorMensal).toFixed(2)}</td>
                <td>R$ {Number(p.valorAnual).toFixed(2)}</td>
                <td>{p.limiteTerminais ?? "Ilimitado"}</td>
                <td>{p.ordem}</td>
                <td>
                  <span className={`fx-badge ${p.ativo ? "fx-badge--success" : "fx-badge--neutral"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setForm(planoParaForm(p))}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemover(p.id)}>
                    Desativar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal aberto={!!form} titulo={form?.id ? "Editar plano" : "Novo plano"} onFechar={() => setForm(null)}>
        {form && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <Input
              label="Descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input
                label="Valor mensal (R$)"
                type="number"
                step="0.01"
                value={form.valorMensal}
                onChange={(e) => setForm({ ...form, valorMensal: e.target.value })}
              />
              <Input
                label="Valor anual (R$)"
                type="number"
                step="0.01"
                value={form.valorAnual}
                onChange={(e) => setForm({ ...form, valorAnual: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input
                label="Limite de terminais (vazio = ilimitado)"
                type="number"
                value={form.limiteTerminais}
                onChange={(e) => setForm({ ...form, limiteTerminais: e.target.value })}
              />
              <Input
                label="Ordem de exibição"
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              />
            </div>
            <div className="fx-field">
              <label>Funcionalidades (uma por linha)</label>
              <textarea
                className="fx-input"
                style={{ height: 120, paddingTop: 8 }}
                value={form.funcionalidades}
                onChange={(e) => setForm({ ...form, funcionalidades: e.target.value })}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--fx-body-sm)" }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativo (visível na tela de seleção)
            </label>
            <Button onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
