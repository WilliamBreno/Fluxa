import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as terminaisApi from "@/api/terminais.api";
import type { Terminal } from "@/api/terminais.api";

export function SecaoTerminais() {
  const { notificar } = useToast();
  const [terminais, setTerminais] = useState<Terminal[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    terminaisApi.listarTerminais().then(setTerminais).catch((err) => notificar(mensagemDeErro(err), "erro"));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await terminaisApi.criarTerminal({ codigo, nome });
      notificar("Terminal criado.", "sucesso");
      setCodigo("");
      setNome("");
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 420 }}>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Novo terminal (caixa)</div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 03" />
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Caixa 3" />
          <Button type="submit" disabled={enviando}>
            {enviando ? "Criando…" : "Criar terminal"}
          </Button>
        </form>
      </Card>

      <Card>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Terminais da loja</div>
        <Table
          itens={terminais}
          chaveItem={(t) => t.id}
          colunas={[
            { chave: "codigo", cabecalho: "Código", render: (t) => t.codigo },
            { chave: "nome", cabecalho: "Nome", render: (t) => t.nome },
            {
              chave: "status",
              cabecalho: "Status",
              render: (t) => (t.turnos[0] ? <Badge variant="success">Caixa aberto</Badge> : <Badge variant="neutral">Fechado</Badge>),
            },
          ]}
        />
      </Card>
    </div>
  );
}
