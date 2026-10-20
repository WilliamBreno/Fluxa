import axios from "axios";

/**
 * Em dev local, "/api" basta — o Vite faz proxy para o backend (vite.config.ts).
 * Em produção (frontend na Vercel, backend no Railway), os domínios são
 * diferentes, então precisa apontar para a URL pública do backend via
 * VITE_API_URL (configurada nas variáveis de ambiente da Vercel).
 */
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

let accessToken: string | null = null;
let lojaAtualId: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setLojaAtual(lojaId: string | null) {
  lojaAtualId = lojaId;
  if (lojaId) localStorage.setItem("fluxa_loja_id", lojaId);
}

export function getLojaAtual(): string | null {
  return lojaAtualId ?? localStorage.getItem("fluxa_loja_id");
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  const lojaId = getLojaAtual();
  if (lojaId) {
    config.headers["x-loja-id"] = lojaId;
  }
  return config;
});

let refreshEmAndamento: Promise<string> | null = null;

/**
 * Único ponto de renovação de sessão. O refresh token é rotacionado a cada uso
 * (o antigo é revogado), então duas chamadas concorrentes com o mesmo cookie
 * fazem uma delas receber 401 — e, se essa resposta chegar por último, derruba
 * a sessão que a outra acabou de renovar. Acontecia ao recarregar a página:
 * o StrictMode roda o efeito de restauração duas vezes, e o interceptor abaixo
 * pode disparar um terceiro refresh. Todas passam a compartilhar a mesma promessa.
 */
export function renovarSessao(): Promise<string> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = api
      .post<{ accessToken: string }>("/auth/refresh")
      .then((r) => {
        setAccessToken(r.data.accessToken);
        return r.data.accessToken;
      })
      .finally(() => {
        refreshEmAndamento = null;
      });
  }
  return refreshEmAndamento;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 402 &&
      error.response?.data?.codigo === "ASSINATURA_INATIVA" &&
      !window.location.pathname.startsWith("/assinatura")
    ) {
      window.location.href = "/assinatura";
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      try {
        const novoToken = await renovarSessao();
        if (novoToken) {
          original.headers.Authorization = `Bearer ${novoToken}`;
          return api(original);
        }
      } catch {
        setAccessToken(null);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
