import { describe, expect, it } from "vitest";
import {
  detectarSeparador,
  paraDataBr,
  paraNumeroBr,
  parseCsvBruto,
  removerBom,
} from "../src/modules/conciliacao/importacao/csv.parser";

describe("removerBom", () => {
  it("remove o BOM UTF-8 quando presente", () => {
    expect(removerBom("﻿abc")).toBe("abc");
  });
  it("não altera texto sem BOM", () => {
    expect(removerBom("abc")).toBe("abc");
  });
});

describe("detectarSeparador", () => {
  it("detecta ';' quando é o mais frequente", () => {
    expect(detectarSeparador("NSU;Valor;Data")).toBe(";");
  });
  it("detecta ',' quando é o mais frequente", () => {
    expect(detectarSeparador("NSU,Valor,Data")).toBe(",");
  });
});

describe("paraNumeroBr", () => {
  it("converte decimal com vírgula", () => {
    expect(paraNumeroBr("123,45")).toBe(123.45);
  });
  it("converte com separador de milhar (ponto) e decimal (vírgula)", () => {
    expect(paraNumeroBr("1.234,56")).toBe(1234.56);
  });
  it("converte número sem vírgula", () => {
    expect(paraNumeroBr("500")).toBe(500);
  });
});

describe("paraDataBr", () => {
  it("converte dd/mm/aaaa", () => {
    const data = paraDataBr("05/03/2026");
    expect(data.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });
  it("converte dd/mm/aaaa hh:mm", () => {
    const data = paraDataBr("05/03/2026 14:30");
    expect(data.toISOString()).toBe("2026-03-05T14:30:00.000Z");
  });
});

describe("parseCsvBruto", () => {
  it("faz parse com separador ';', BOM e decimal vírgula", () => {
    const csv = "﻿NSU;Valor;Data\n123456;123,45;05/03/2026\n";
    const resultado = parseCsvBruto(csv);
    expect(resultado.cabecalhos).toEqual(["NSU", "Valor", "Data"]);
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toEqual({ NSU: "123456", Valor: "123,45", Data: "05/03/2026" });
  });

  it("faz parse com separador ','", () => {
    const csv = "NSU,Valor,Data\n999,50.00,01/01/2026\n";
    const resultado = parseCsvBruto(csv);
    expect(resultado.linhas[0].NSU).toBe("999");
  });

  it("retorna vazio para conteúdo vazio", () => {
    expect(parseCsvBruto("")).toEqual({ cabecalhos: [], linhas: [] });
  });
});
