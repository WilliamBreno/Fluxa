import type { Request, Response } from "express";
import { AppError } from "../../middlewares/errorHandler";
import * as authService from "./auth.service";

const REFRESH_COOKIE = "fluxa_refresh_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
};

export async function loginController(req: Request, res: Response) {
  const { email, senha, lojaId } = req.body;
  const resultado = await authService.login({
    email,
    senha,
    lojaId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.cookie(REFRESH_COOKIE, resultado.refreshToken, COOKIE_OPTS);
  res.json({ accessToken: resultado.accessToken, usuario: resultado.usuario });
}

export async function refreshController(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError("Refresh token ausente.", 401);

  const resultado = await authService.refresh(token, req.ip);
  res.cookie(REFRESH_COOKIE, resultado.refreshToken, COOKIE_OPTS);
  res.json({ accessToken: resultado.accessToken });
}

export async function meController(req: Request, res: Response) {
  const usuario = await authService.me(req.usuario!.id);
  res.json(usuario);
}

export async function logoutController(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await authService.logout(token, req.usuario?.id);
  }
  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
  res.status(204).send();
}
