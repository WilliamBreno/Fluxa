import type { Request, Response } from "express";
import { REFRESH_COOKIE, COOKIE_OPTS } from "../auth/auth.controller";
import * as cadastroService from "./cadastro.service";

export async function cadastrarController(req: Request, res: Response) {
  const resultado = await cadastroService.cadastrar({ ...req.body, ip: req.ip });

  res.cookie(REFRESH_COOKIE, resultado.refreshToken, COOKIE_OPTS);
  res.status(201).json({
    accessToken: resultado.accessToken,
    usuario: resultado.usuario,
    lojaId: resultado.lojaId,
  });
}
