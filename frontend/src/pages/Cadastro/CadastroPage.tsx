import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";
import * as cadastroApi from "@/api/cadastro.api";

const OPCOES_SEGMENTO = [
  { value: "VAREJO", label: "Varejo" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "SERVICOS", label: "Serviços" },
  { value: "BELEZA", label: "Beleza" },
  { value: "OUTRO", label: "Outro" },
];

export function CadastroPage() {
  const { usuario, aplicarSessao } = useAuth();
  const navigate = useNavigate();
  const { notificar } = useToast();

  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [documento, setDocumento] = useState("");
  const [segmento, setSegmento] = useState("VAREJO");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/terminais" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const resultado = await cadastroApi.cadastrar({
        responsavel: { nome: nomeResponsavel, email, telefone, senha },
        negocio: { nome: nomeNegocio, documento, segmento },
      });
      aplicarSessao(resultado.usuario, resultado.accessToken, resultado.lojaId);
      notificar("Conta criada! Você tem 3 dias de teste grátis para conhecer o Fluxa.", "sucesso");
      navigate("/planos");
    } catch (err) {
      notificar(mensagemDeErro(err), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--fx-surface-page)",
        padding: 16,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ font: "var(--fx-heading-1)", marginBottom: 4 }}>Criar conta no Fluxa</div>
          <div style={{ font: "var(--fx-body)", color: "var(--fx-text-tertiary)" }}>
            3 dias de teste grátis, sem cartão de crédito.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fx-overline">Quem responde pelo negócio</div>
          <Input label="Nome completo" required autoFocus value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} />
          <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Telefone / WhatsApp"
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
          <Input
            label="Senha"
            type="password"
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <div className="fx-overline" style={{ marginTop: 8 }}>
            Sobre o negócio
          </div>
          <Input label="Nome do negócio" required value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
          <Input
            label="CNPJ ou CPF"
            required
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="Só números"
          />
          <Select label="Segmento" opcoes={OPCOES_SEGMENTO} value={segmento} onChange={(e) => setSegmento(e.target.value)} />

          <Button type="submit" block disabled={enviando} style={{ marginTop: 8 }}>
            {enviando ? "Criando conta…" : "Criar conta e continuar"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, font: "var(--fx-body-sm)" }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </Card>
    </div>
  );
}
