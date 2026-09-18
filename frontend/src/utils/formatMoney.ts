export function formatarBRL(valor: string | number): string {
  const num = typeof valor === "string" ? Number(valor) : valor;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarPercentual(valor: number): string {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
