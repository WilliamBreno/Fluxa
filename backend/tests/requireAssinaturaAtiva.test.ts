import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { requireAssinaturaAtiva as RequireAssinaturaAtiva } from "../src/middlewares/auth.middleware";

const prismaMock = {
  assinatura: { findUnique: vi.fn() },
};

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

function criarReqResNext(usuario: { superAdmin: boolean; lojaId: string }) {
  const req = { usuario } as any;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("requireAssinaturaAtiva", () => {
  let requireAssinaturaAtiva: typeof RequireAssinaturaAtiva;

  // Import dinâmico fora dos `it`: paga o custo de transform do módulo (que
  // arrasta jwt/bcrypt/prisma) uma única vez no setup, em vez de arriscar
  // estourar o timeout padrão de um teste individual na primeira chamada.
  beforeAll(async () => {
    ({ requireAssinaturaAtiva } = await import("../src/middlewares/auth.middleware"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("libera direto quando o usuário é superAdmin, sem nem consultar o banco", async () => {
    const { req, res, next } = criarReqResNext({ superAdmin: true, lojaId: "loja-1" });

    await requireAssinaturaAtiva(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(prismaMock.assinatura.findUnique).not.toHaveBeenCalled();
  });

  it("libera quando está em TRIAL com trialFim no futuro", async () => {
    prismaMock.assinatura.findUnique.mockResolvedValueOnce({
      status: "TRIAL",
      trialFim: new Date(Date.now() + 60_000),
      periodoAtualFim: null,
    });
    const { req, res, next } = criarReqResNext({ superAdmin: false, lojaId: "loja-1" });

    await requireAssinaturaAtiva(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("bloqueia com 402 quando o trial já expirou e não há plano ativo", async () => {
    prismaMock.assinatura.findUnique.mockResolvedValueOnce({
      status: "TRIAL",
      trialFim: new Date(Date.now() - 60_000),
      periodoAtualFim: null,
    });
    const { req, res, next } = criarReqResNext({ superAdmin: false, lojaId: "loja-1" });

    await requireAssinaturaAtiva(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it("libera quando está ATIVA sem periodoAtualFim definido (conta grandfathered/gerenciada manualmente)", async () => {
    prismaMock.assinatura.findUnique.mockResolvedValueOnce({
      status: "ATIVA",
      trialFim: new Date(0),
      periodoAtualFim: null,
    });
    const { req, res, next } = criarReqResNext({ superAdmin: false, lojaId: "loja-1" });

    await requireAssinaturaAtiva(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("bloqueia com 402 quando ATIVA mas periodoAtualFim já passou (assinatura vencida)", async () => {
    prismaMock.assinatura.findUnique.mockResolvedValueOnce({
      status: "ATIVA",
      trialFim: new Date(0),
      periodoAtualFim: new Date(Date.now() - 1000),
    });
    const { req, res, next } = criarReqResNext({ superAdmin: false, lojaId: "loja-1" });

    await requireAssinaturaAtiva(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
  });
});
