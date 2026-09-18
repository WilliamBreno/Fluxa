import type { Request, Response } from "express";
import * as usuariosService from "./usuarios.service";

function contexto(req: Request) {
  return { usuarioId: req.usuario!.id, lojaId: req.usuario?.lojaId };
}

export async function criarUsuarioController(req: Request, res: Response) {
  const usuario = await usuariosService.criar(req.body, contexto(req));
  res.status(201).json(usuario);
}

export async function listarUsuariosController(req: Request, res: Response) {
  res.json(await usuariosService.listar(req.usuario?.lojaId));
}

export async function atualizarUsuarioController(req: Request, res: Response) {
  res.json(await usuariosService.atualizar(req.params.id, req.body, contexto(req)));
}

export async function vincularLojaController(req: Request, res: Response) {
  const { lojaId, role } = req.body;
  res.status(201).json(await usuariosService.vincularLoja(req.params.id, lojaId, role));
}
