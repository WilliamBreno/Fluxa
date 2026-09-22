import type { Request, Response } from "express";
import * as notificacoesService from "./notificacoes.service";

export async function listarController(req: Request, res: Response) {
  const apenasNaoLidas = req.query.apenasNaoLidas === "true";
  res.json(await notificacoesService.listar(req.usuario!.lojaId!, { apenasNaoLidas }));
}

export async function marcarComoLidaController(req: Request, res: Response) {
  await notificacoesService.marcarComoLida(req.params.id, req.usuario!.lojaId!);
  res.status(204).send();
}

export async function marcarTodasComoLidasController(req: Request, res: Response) {
  await notificacoesService.marcarTodasComoLidas(req.usuario!.lojaId!);
  res.status(204).send();
}
