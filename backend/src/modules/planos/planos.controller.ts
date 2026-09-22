import type { Request, Response } from "express";
import * as planosService from "./planos.service";

export async function listarController(req: Request, res: Response) {
  res.json(await planosService.listarAtivos());
}

export async function listarAdminController(req: Request, res: Response) {
  res.json(await planosService.listarTodos());
}

export async function criarController(req: Request, res: Response) {
  res.status(201).json(await planosService.criar(req.body));
}

export async function atualizarController(req: Request, res: Response) {
  res.json(await planosService.atualizar(req.params.id, req.body));
}

export async function removerController(req: Request, res: Response) {
  await planosService.remover(req.params.id);
  res.status(204).send();
}
