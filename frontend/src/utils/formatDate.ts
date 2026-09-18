export function formatarDataHora(valor: string | Date): string {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatarData(valor: string | Date): string {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return data.toLocaleDateString("pt-BR");
}
