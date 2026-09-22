import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  fiscalProvider: process.env.FISCAL_PROVIDER ?? "stub",
  maquininhaProvider: process.env.MAQUININHA_PROVIDER ?? "stub",
  notificacaoProvider: process.env.NOTIFICACAO_PROVIDER ?? "stub",
  pagamentoProvider: process.env.PAGAMENTO_PROVIDER ?? "stub",
  infinitepayApiKey: process.env.INFINITEPAY_API_KEY,
  infinitepayHandle: process.env.INFINITEPAY_HANDLE,
  infinitepayWebhookSecret: process.env.INFINITEPAY_WEBHOOK_SECRET,
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:5173",
  apiPublicUrl: process.env.API_PUBLIC_URL ?? "http://localhost:3333",
  defaultTimezone: process.env.DEFAULT_TIMEZONE ?? "America/Sao_Paulo",
};
