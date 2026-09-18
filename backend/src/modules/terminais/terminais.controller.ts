import type { Request, Response } from "express";
import * as terminaisService from "./terminais.service";

export async function criarTerminalController(req: Request, res: Response) {
  res.status(201).json(await terminaisService.criar(req.usuario!.lojaId!, req.body));
}

export async function listarTerminaisController(req: Request, res: Response) {
  res.json(await terminaisService.listar(req.usuario!.lojaId!));
}
