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

let refreshEmAndamento: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      try {
        if (!refreshEmAndamento) {
          refreshEmAndamento = api
            .post("/auth/refresh")
            .then((r) => {
              setAccessToken(r.data.accessToken);
              return r.data.accessToken as string;
            })
            .finally(() => {
              refreshEmAndamento = null;
            });
        }
        const novoToken = await refreshEmAndamento;
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
