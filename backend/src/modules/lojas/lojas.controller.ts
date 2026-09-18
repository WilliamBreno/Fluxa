import type { Request, Response } from "express";
import * as lojasService from "./lojas.service";

export async function criarLojaController(req: Request, res: Response) {
  res.status(201).json(await lojasService.criar(req.body));
}

export async function listarMinhasLojasController(req: Request, res: Response) {
  res.json(await lojasService.listarMinhas(req.usuario!.id, req.usuario!.superAdmin));
}
