import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { modalidadesCompativeis, valorComparacaoMovimentacao } from "../src/modules/conciliacao/motor/candidatos";

describe("modalidadesCompativeis", () => {
  it("débito só casa com DEBITO", () => {
    expect(modalidadesCompativeis("DEBITO")).toEqual(["DEBITO"]);
  });
  it("crédito casa com à vista e parcelado", () => {
    expect(modalidadesCompativeis("CREDITO")).toEqual(["CREDITO_A_VISTA", "CREDITO_PARCELADO"]);
  });
  it("outras formas de pagamento não casam com nenhuma modalidade de cartão", () => {
    expect(modalidadesCompativeis("PIX")).toEqual([]);
    expect(modalidadesCompativeis(null)).toEqual([]);
  });
});

describe("valorComparacaoMovimentacao", () => {
  it("venda compara com o valor positivo", () => {
    const resultado = valorComparacaoMovimentacao({ tipo: "VENDA", valor: new Prisma.Decimal("100.00") });
    expect(resultado.toFixed(2)).toBe("100.00");
  });
  it("cancelamento compara com o valor negativo (estorno no extrato)", () => {
    const resultado = valorComparacaoMovimentacao({ tipo: "CANCELAMENTO", valor: new Prisma.Decimal("50.00") });
    expect(resultado.toFixed(2)).toBe("-50.00");
  });
  it("devolução compara com o valor negativo", () => {
    const resultado = valorComparacaoMovimentacao({ tipo: "DEVOLUCAO", valor: new Prisma.Decimal("30.00") });
    expect(resultado.toFixed(2)).toBe("-30.00");
  });
});
