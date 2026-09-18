type Nivel = "info" | "warn" | "error";

function linha(nivel: Nivel, mensagem: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${nivel.toUpperCase()}] ${mensagem}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[nivel === "info" ? "log" : nivel](base, meta);
  } else {
    // eslint-disable-next-line no-console
    console[nivel === "info" ? "log" : nivel](base);
  }
}

export const logger = {
  info: (mensagem: string, meta?: unknown) => linha("info", mensagem, meta),
  warn: (mensagem: string, meta?: unknown) => linha("warn", mensagem, meta),
  error: (mensagem: string, meta?: unknown) => linha("error", mensagem, meta),
};
