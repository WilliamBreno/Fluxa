import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { mensagemDeErro, useToast } from "@/components/ui/Toast";

export function LoginPage() {
  const { entrar, usuario } = useAuth();
  const navigate = useNavigate();
  const { notificar } = useToast();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (usuario) return <Navigate to="/terminais" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      navigate("/terminais");
    } catch (err) {
      const msg = mensagemDeErro(err);
      setErro(msg);
      notificar(msg, "erro");
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
      <Card style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ font: "var(--fx-heading-1)", marginBottom: 4 }}>Fluxa</div>
          <div style={{ font: "var(--fx-body)", color: "var(--fx-text-tertiary)" }}>
            Abertura e fechamento de caixa
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input
            label="E-mail"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
          <Input
            label="Senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erro={erro ?? undefined}
          />
          <Button type="submit" block disabled={enviando} style={{ marginTop: 8 }}>
            {enviando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
