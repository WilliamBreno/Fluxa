import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { classificarDivergencia, formatarBRL } from "../src/utils/money";

describe("classificarDivergencia", () => {
  const tolerancia = new Prisma.Decimal(5);

  it("classifica como EXATO quando a divergência está dentro da tolerância", () => {
    expect(classificarDivergencia(new Prisma.Decimal(0), tolerancia)).toBe("EXATO");
    expect(classificarDivergencia(new Prisma.Decimal(5), tolerancia)).toBe("EXATO");
    expect(classificarDivergencia(new Prisma.Decimal(-5), tolerancia)).toBe("EXATO");
  });

  it("classifica como SOBRA quando o valor contado é maior que o esperado", () => {
    expect(classificarDivergencia(new Prisma.Decimal(10.5), tolerancia)).toBe("SOBRA");
  });

  it("classifica como FALTA quando o valor contado é menor que o esperado", () => {
    expect(classificarDivergencia(new Prisma.Decimal(-10.5), tolerancia)).toBe("FALTA");
  });
});

describe("formatarBRL", () => {
  it("formata Decimal como moeda brasileira", () => {
    expect(formatarBRL(new Prisma.Decimal("1234.5"))).toBe("R$ 1.234,50");
  });

  it("formata number como moeda brasileira", () => {
    expect(formatarBRL(0)).toBe("R$ 0,00");
  });
});
