import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/api/auth.api";
import { setAccessToken, setLojaAtual, getLojaAtual } from "@/api/client";
import { conectarSocket, desconectarSocket } from "@/sockets/socketClient";
import * as offlineSync from "@/offline/sync";
import type { UsuarioLogado } from "@/api/auth.api";

interface AuthContextValue {
  usuario: UsuarioLogado | null;
  lojaId: string | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  /** Usado pelo cadastro público: a conta já vem com sessão emitida, sem precisar de um segundo login. */
  aplicarSessao: (usuario: UsuarioLogado, accessToken: string, lojaId: string) => void;
  sair: () => Promise<void>;
  selecionarLoja: (lojaId: string) => void;
  papelAtual: "OPERADOR" | "SUPERVISOR" | "GERENTE" | "ADMIN" | null;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [lojaId, setLojaId] = useState<string | null>(getLojaAtual());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    authApi
      .refresh()
      .then(async ({ accessToken }) => {
        setAccessToken(accessToken);
        const usuarioAtual = await authApi.me();
        setUsuario(usuarioAtual);
        conectarSocket(accessToken);
        offlineSync.retomar();
      })
      .catch(() => {
        setAccessToken(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resultado = await authApi.login(email, senha);
    setAccessToken(resultado.accessToken);
    setUsuario(resultado.usuario);
    const primeiraLoja = resultado.usuario.lojas[0]?.lojaId ?? null;
    if (primeiraLoja) {
      setLojaAtual(primeiraLoja);
      setLojaId(primeiraLoja);
    }
    conectarSocket(resultado.accessToken);
    offlineSync.retomar();
  }, []);

  const aplicarSessao = useCallback((novoUsuario: UsuarioLogado, accessToken: string, novaLojaId: string) => {
    setAccessToken(accessToken);
    setUsuario(novoUsuario);
    setLojaAtual(novaLojaId);
    setLojaId(novaLojaId);
    conectarSocket(accessToken);
    offlineSync.retomar();
  }, []);

  const sair = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setAccessToken(null);
    setUsuario(null);
    desconectarSocket();
  }, []);

  const selecionarLoja = useCallback((novaLojaId: string) => {
    setLojaAtual(novaLojaId);
    setLojaId(novaLojaId);
  }, []);

  const papelAtual = useMemo(() => {
    if (!usuario) return null;
    if (usuario.superAdmin) return usuario.roleGlobal;
    return usuario.lojas.find((l) => l.lojaId === lojaId)?.role ?? null;
  }, [usuario, lojaId]);

  return (
    <AuthContext.Provider
      value={{ usuario, lojaId, carregando, entrar, aplicarSessao, sair, selecionarLoja, papelAtual }}
    >
      {children}
    </AuthContext.Provider>
  );
}
