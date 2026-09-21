import { describe, expect, it } from "vitest";
import { detectarColunas } from "../src/modules/conciliacao/importacao/colunas.detector";

describe("detectarColunas", () => {
  it("detecta colunas por sinônimo exato (case/acento-insensível)", () => {
    const { mapeamento, camposPendentes } = detectarColunas([
      "NSU/DOC",
      "Bandeira",
      "Valor Bruto",
      "Data da Venda",
      "Data de Pagamento",
      "Parcelas",
    ]);
    expect(mapeamento.nsu).toBe("NSU/DOC");
    expect(mapeamento.bandeira).toBe("Bandeira");
    expect(mapeamento.valorBruto).toBe("Valor Bruto");
    expect(mapeamento.dataVenda).toBe("Data da Venda");
    expect(mapeamento.dataPagamento).toBe("Data de Pagamento");
    expect(mapeamento.parcelas).toBe("Parcelas");
    expect(camposPendentes).toEqual([]);
  });

  it("marca campos obrigatórios como pendentes quando não encontrados", () => {
    const { camposPendentes } = detectarColunas(["Coluna desconhecida"]);
    expect(camposPendentes).toEqual(["valorBruto", "dataVenda", "dataPagamento"]);
  });

  it("não confunde 'Valor Líquido' com 'Valor Bruto'", () => {
    const { mapeamento } = detectarColunas(["Valor Líquido", "Valor Bruto"]);
    expect(mapeamento.valorLiquido).toBe("Valor Líquido");
    expect(mapeamento.valorBruto).toBe("Valor Bruto");
  });

  it("ignora acentuação e maiúsculas/minúsculas", () => {
    const { mapeamento } = detectarColunas(["autorização", "DATA PREVISTA"]);
    expect(mapeamento.autorizacao).toBe("autorização");
    expect(mapeamento.dataPagamento).toBe("DATA PREVISTA");
  });
});
