import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const turnoMock = {
  id: "turno-1",
  lojaId: "loja-1",
  status: "ABERTO",
  fundoTrocoInformado: new Prisma.Decimal(0),
  loja: { configuracao: null },
};

const movimentacaoExistente = {
  id: "mov-existente",
  turnoId: "turno-1",
  tipo: "VENDA",
  formaPagamento: "DINHEIRO",
  valor: new Prisma.Decimal("50.00"),
  status: "ATIVA",
  chaveIdempotencia: "chave-fixa",
};

const prismaMock = {
  turnoCaixa: { findUnique: vi.fn() },
  movimentacaoCaixa: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  integracaoLog: { create: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/socket", () => ({ emitirParaLoja: vi.fn() }));
vi.mock("../src/modules/auditoria/auditoria.service", () => ({ registrar: vi.fn() }));
vi.mock("../src/modules/integracoes/integracoes.factory", () => ({
  getFiscalAdapter: () => ({ emitirCupom: vi.fn().mockResolvedValue({ sucesso: true, simulado: true }) }),
  getMaquininhaAdapter: () => ({ iniciarPagamento: vi.fn().mockResolvedValue({ sucesso: true, simulado: true }) }),
}));

const ctx = { usuarioId: "usuario-1", roleNaLoja: "OPERADOR" as const };

describe("movimentacoes.service.criar — idempotência", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.turnoCaixa.findUnique.mockResolvedValue(turnoMock);
  });

  it("retorna o registro existente sem criar de novo quando a chave já foi usada (checagem antecipada)", async () => {
    prismaMock.movimentacaoCaixa.findUnique.mockResolvedValueOnce(movimentacaoExistente);

    const { criar } = await import("../src/modules/movimentacoes/movimentacoes.service");
    const resultado = await criar(
      "turno-1",
      { tipo: "VENDA", formaPagamento: "DINHEIRO", valor: 50, chaveIdempotencia: "chave-fixa" },
      ctx
    );

    expect(resultado).toBe(movimentacaoExistente);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("em corrida de concorrência (P2002 no create), devolve o registro que a outra tentativa criou", async () => {
    prismaMock.movimentacaoCaixa.findUnique
      .mockResolvedValueOnce(null) // checagem antecipada: ainda não existe
      .mockResolvedValueOnce(movimentacaoExistente); // depois do P2002: a outra tentativa já criou

    const erroP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
    });
    prismaMock.$transaction.mockRejectedValueOnce(erroP2002);

    const { criar } = await import("../src/modules/movimentacoes/movimentacoes.service");
    const resultado = await criar(
      "turno-1",
      { tipo: "VENDA", formaPagamento: "DINHEIRO", valor: 50, chaveIdempotencia: "chave-fixa" },
      ctx
    );

    expect(resultado).toBe(movimentacaoExistente);
  });

  it("sem chaveIdempotencia, segue o fluxo normal de criação", async () => {
    prismaMock.movimentacaoCaixa.findUnique.mockResolvedValue(null);
    const movimentacaoNova = { ...movimentacaoExistente, id: "mov-nova", chaveIdempotencia: null };
    prismaMock.$transaction.mockImplementationOnce(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
    prismaMock.movimentacaoCaixa.create.mockResolvedValueOnce(movimentacaoNova);

    const { criar } = await import("../src/modules/movimentacoes/movimentacoes.service");
    const resultado = await criar("turno-1", { tipo: "VENDA", formaPagamento: "DINHEIRO", valor: 50 }, ctx);

    expect(resultado).toBe(movimentacaoNova);
  });
});
