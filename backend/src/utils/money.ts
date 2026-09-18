import { Prisma } from "@prisma/client";

/** Sempre usar Prisma.Decimal para dinheiro — nunca Number()/float, para não perder centavos. */
export type Money = Prisma.Decimal;

export function toDecimal(valor: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(valor);
}

export function somarDecimais(valores: Prisma.Decimal[]): Prisma.Decimal {
  return valores.reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0));
}

export function formatarBRL(valor: Prisma.Decimal | number | string): string {
  const num = typeof valor === "object" ? valor.toNumber() : Number(valor);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function classificarDivergencia(
  divergencia: Prisma.Decimal,
  tolerancia: Prisma.Decimal
): "EXATO" | "SOBRA" | "FALTA" {
  if (divergencia.abs().lessThanOrEqualTo(tolerancia)) return "EXATO";
  return divergencia.greaterThan(0) ? "SOBRA" : "FALTA";
}
