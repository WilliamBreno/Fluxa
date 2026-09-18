import type { Request, Response } from "express";
import * as fechamentoService from "./fechamento.service";

function contexto(req: Request) {
  return {
    usuarioId: req.usuario!.id,
    roleNaLoja: req.usuario!.roleNaLoja,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

export async function iniciarController(req: Request, res: Response) {
  const fechamento = await fechamentoService.iniciar(req.params.id, contexto(req));
  res.status(201).json(fechamento);
}

export async function registrarContagemController(req: Request, res: Response) {
  const resultado = await fechamentoService.registrarContagem(req.params.id, req.body, contexto(req));
  res.json(resultado);
}

export async function obterDivergenciaController(req: Request, res: Response) {
  const resultado = await fechamentoService.obterDivergencia(req.params.id);
  res.json(resultado);
}

export async function confirmarController(req: Request, res: Response) {
  const resultado = await fechamentoService.confirmar(req.params.id, req.body, contexto(req));
  res.json(resultado);
}
