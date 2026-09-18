import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as usuariosApi from "@/api/usuarios.api";
import type { Usuario } from "@/api/usuarios.api";

const OPCOES_ROLE = [
  { value: "OPERADOR", label: "Operador" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "GERENTE", label: "Gerente" },
  { value: "ADMIN", label: "Admin" },
];

export function SecaoUsuarios() {
  const { notificar } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [roleGlobal, setRoleGlobal] = useState<Usuario["roleGlobal"]>("OPERADOR");
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    usuariosApi.listarUsuarios().then(setUsuarios).catch((err) => notificar(mensagemDeErro(err), "erro"));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await usuariosApi.criarUsuario({ nome, email, senha, roleGlobal });
      notificar("Usuário criado.", "sucesso");
      setNome("");
      setEmail("");
      setSenha("");
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function alternarAtivo(usuario: Usuario) {
    try {
      await usuariosApi.atualizarUsuario(usuario.id, { ativo: !usuario.ativo });
      carregar();
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ maxWidth: 560 }}>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Novo usuário</div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Senha inicial"
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Select
            label="Perfil"
            opcoes={OPCOES_ROLE}
            value={roleGlobal}
            onChange={(e) => setRoleGlobal(e.target.value as Usuario["roleGlobal"])}
          />
          <Button type="submit" disabled={enviando}>
            {enviando ? "Criando…" : "Criar usuário"}
          </Button>
        </form>
      </Card>

      <Card>
        <div style={{ font: "var(--fx-heading-4)", marginBottom: 12 }}>Usuários da loja</div>
        <Table
          itens={usuarios}
          chaveItem={(u) => u.id}
          colunas={[
            { chave: "nome", cabecalho: "Nome", render: (u) => u.nome },
            { chave: "email", cabecalho: "E-mail", render: (u) => u.email },
            { chave: "role", cabecalho: "Perfil", render: (u) => u.roleGlobal },
            {
              chave: "status",
              cabecalho: "Status",
              render: (u) => (
                <Button size="sm" variant="ghost" onClick={() => alternarAtivo(u)}>
                  {u.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
