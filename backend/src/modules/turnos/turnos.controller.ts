import type { Request, Response } from "express";
import * as turnosService from "./turnos.service";

function contexto(req: Request) {
  return {
    usuarioId: req.usuario!.id,
    roleNaLoja: req.usuario!.roleNaLoja,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

export async function sugestaoFundoTrocoController(req: Request, res: Response) {
  const { terminalId } = req.query as { terminalId: string };
  res.json(await turnosService.sugestaoFundoTroco(terminalId));
}

export async function abrirTurnoController(req: Request, res: Response) {
  const turno = await turnosService.abrirTurno(req.body, contexto(req));
  res.status(201).json(turno);
}

export async function trocarOperadorController(req: Request, res: Response) {
  await turnosService.trocarOperador(req.params.id, req.body, contexto(req));
  res.status(204).send();
}

export async function leituraXController(req: Request, res: Response) {
  const resultado = await turnosService.leituraX(req.params.id, contexto(req));
  res.json(resultado);
}

export async function listarTurnosController(req: Request, res: Response) {
  const query = req.query as unknown as {
    terminalId?: string;
    status?: "ABERTO" | "FECHADO";
    pagina: number;
    tamanhoPagina: number;
  };
  res.json(await turnosService.listar(query, contexto(req)));
}

export async function buscarTurnoController(req: Request, res: Response) {
  res.json(await turnosService.buscarPorId(req.params.id));
}
