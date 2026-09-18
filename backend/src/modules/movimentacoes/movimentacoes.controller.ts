import type { Request, Response } from "express";
import * as movimentacoesService from "./movimentacoes.service";

function contexto(req: Request) {
  return {
    usuarioId: req.usuario!.id,
    roleNaLoja: req.usuario!.roleNaLoja,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

export async function criarMovimentacaoController(req: Request, res: Response) {
  const movimentacao = await movimentacoesService.criar(req.params.turnoId, req.body, contexto(req));
  res.status(201).json(movimentacao);
}

export async function conferirMovimentacaoController(req: Request, res: Response) {
  await movimentacoesService.conferir(req.params.id, contexto(req));
  res.status(204).send();
}

export async function listarMovimentacoesController(req: Request, res: Response) {
  const movimentacoes = await movimentacoesService.listarPorTurno(req.params.turnoId);
  res.json(movimentacoes);
}
