import type { Request, Response } from "express";
import * as servicosService from "./servicos.service";

function ctx(req: Request) {
  return { usuarioId: req.usuario!.id, lojaId: req.usuario!.lojaId! };
}

export async function listarServicosController(req: Request, res: Response) {
  res.json(await servicosService.listar(req.usuario!.lojaId!, req.query.incluirInativos === "true"));
}

export async function criarServicoController(req: Request, res: Response) {
  res.status(201).json(await servicosService.criar(req.body, ctx(req)));
}

export async function atualizarServicoController(req: Request, res: Response) {
  res.json(await servicosService.atualizar(req.params.id, req.body, ctx(req)));
}
