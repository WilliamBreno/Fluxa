import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { gerarCsvBr, formatarDataHoraBr } from "../src/modules/relatorios/csv/csv.util";

describe("gerarCsvBr", () => {
  it("inclui BOM UTF-8 no início do arquivo", () => {
    const csv = gerarCsvBr([{ a: "1" }], [{ chave: "a", cabecalho: "A" }]);
    expect(csv.toString("utf-8").charCodeAt(0)).toBe(0xfeff);
  });

  it("usa ';' como separador e formata Decimal com vírgula", () => {
    const csv = gerarCsvBr(
      [{ nome: "Venda", valor: new Prisma.Decimal("1234.5") }],
      [
        { chave: "nome", cabecalho: "Nome" },
        { chave: "valor", cabecalho: "Valor" },
      ]
    );
    const texto = csv.toString("utf-8").replace(/^﻿/, "");
    const linhas = texto.split("\r\n");
    expect(linhas[0]).toBe("Nome;Valor");
    expect(linhas[1]).toBe("Venda;1234,50");
  });

  it("protege contra injeção de fórmula prefixando com apóstrofo", () => {
    const csv = gerarCsvBr(
      [{ texto: "=SOMA(A1:A2)" }, { texto: "+1+1" }, { texto: "-1" }, { texto: "@cmd" }, { texto: "normal" }],
      [{ chave: "texto", cabecalho: "Texto" }]
    );
    const linhas = csv.toString("utf-8").replace(/^﻿/, "").split("\r\n");
    expect(linhas[1]).toBe("'=SOMA(A1:A2)");
    expect(linhas[2]).toBe("'+1+1");
    expect(linhas[3]).toBe("'-1");
    expect(linhas[4]).toBe("'@cmd");
    expect(linhas[5]).toBe("normal");
  });

  it("escapa células com ';' ou aspas envolvendo em aspas duplas", () => {
    const csv = gerarCsvBr([{ texto: 'a;b"c' }], [{ chave: "texto", cabecalho: "Texto" }]);
    const linhas = csv.toString("utf-8").replace(/^﻿/, "").split("\r\n");
    expect(linhas[1]).toBe('"a;b""c"');
  });

  it("aplica a função formatar quando fornecida", () => {
    const csv = gerarCsvBr(
      [{ valor: 10 }],
      [{ chave: "dobro", cabecalho: "Dobro", formatar: (l: { valor: number }) => l.valor * 2 }]
    );
    const linhas = csv.toString("utf-8").replace(/^﻿/, "").split("\r\n");
    expect(linhas[1]).toBe("20");
  });
});

describe("formatarDataHoraBr", () => {
  it("formata como dd/mm/aaaa hh:mm no fuso de São Paulo", () => {
    // 2026-03-05T12:30:00Z = 2026-03-05T09:30:00-03:00
    const data = new Date("2026-03-05T12:30:00Z");
    expect(formatarDataHoraBr(data)).toBe("05/03/2026 09:30");
  });
});
