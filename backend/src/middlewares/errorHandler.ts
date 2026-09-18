import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: "Dados inválidos.",
      detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ erro: "Registro conflitante já existe.", meta: err.meta });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ erro: "Registro não encontrado." });
    }
  }

  logger.error("Erro não tratado", err);
  return res.status(500).json({ erro: "Erro interno do servidor." });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
