import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMock = {
  notificacao: { create: vi.fn() },
};

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/socket", () => ({ emitirParaLoja: vi.fn() }));

describe("notificacoesService.criar — deduplicação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria normalmente na primeira vez", async () => {
    const nova = { id: "notif-1", lojaId: "loja-1", tipo: "TURNO_ABERTO_HORAS_DEMAIS" };
    prismaMock.notificacao.create.mockResolvedValueOnce(nova);

    const { criar } = await import("../src/modules/notificacoes/notificacoes.service");
    const resultado = await criar({
      lojaId: "loja-1",
      tipo: "TURNO_ABERTO_HORAS_DEMAIS",
      titulo: "Turno aberto há muito tempo",
      mensagem: "...",
      entidadeId: "turno-1",
    });

    expect(resultado).toBe(nova);
  });

  it("retorna null em vez de propagar erro quando a mesma ocorrência já existe (P2002)", async () => {
    const erroP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
    });
    prismaMock.notificacao.create.mockRejectedValueOnce(erroP2002);

    const { criar } = await import("../src/modules/notificacoes/notificacoes.service");
    const resultado = await criar({
      lojaId: "loja-1",
      tipo: "TURNO_ABERTO_HORAS_DEMAIS",
      titulo: "Turno aberto há muito tempo",
      mensagem: "...",
      entidadeId: "turno-1",
    });

    expect(resultado).toBeNull();
  });

  it("propaga qualquer outro erro que não seja P2002", async () => {
    prismaMock.notificacao.create.mockRejectedValueOnce(new Error("banco fora do ar"));

    const { criar } = await import("../src/modules/notificacoes/notificacoes.service");
    await expect(
      criar({
        lojaId: "loja-1",
        tipo: "TURNO_ABERTO_HORAS_DEMAIS",
        titulo: "Turno aberto há muito tempo",
        mensagem: "...",
        entidadeId: "turno-1",
      })
    ).rejects.toThrow("banco fora do ar");
  });
});
