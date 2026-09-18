import type { NextFunction, Request, Response } from "express";

interface Balde {
  tentativas: number;
  resetaEm: number;
}

const baldes = new Map<string, Balde>();

/**
 * Rate limiter simples em memória (suficiente para um servidor único local na loja).
 * Usado para proteger /auth/login contra força bruta.
 */
export function rateLimit(opts: { janelaMs: number; maxTentativas: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const chave = `${req.ip}:${req.path}`;
    const agora = Date.now();
    const balde = baldes.get(chave);

    if (!balde || balde.resetaEm < agora) {
      baldes.set(chave, { tentativas: 1, resetaEm: agora + opts.janelaMs });
      return next();
    }

    if (balde.tentativas >= opts.maxTentativas) {
      const segundosRestantes = Math.ceil((balde.resetaEm - agora) / 1000);
      return res.status(429).json({
        erro: `Muitas tentativas. Tente novamente em ${segundosRestantes}s.`,
      });
    }

    balde.tentativas += 1;
    next();
  };
}
