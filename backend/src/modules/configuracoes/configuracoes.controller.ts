import type { Request, Response } from "express";
import * as configuracoesService from "./configuracoes.service";

export async function obterConfiguracaoController(req: Request, res: Response) {
  res.json(await configuracoesService.obter(req.usuario!.lojaId!));
}

export async function atualizarConfiguracaoController(req: Request, res: Response) {
  res.json(
    await configuracoesService.atualizar(req.usuario!.lojaId!, req.body, { usuarioId: req.usuario!.id })
  );
}
