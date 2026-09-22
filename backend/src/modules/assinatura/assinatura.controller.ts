import type { Request, Response } from "express";
import { AppError } from "../../middlewares/errorHandler";
import * as assinaturaService from "./assinatura.service";

function lojaIdObrigatorio(req: Request): string {
  const lojaId = req.usuario?.lojaId;
  if (!lojaId) throw new AppError("Cabeçalho x-loja-id é obrigatório para esta rota.", 400);
  return lojaId;
}

export async function obterStatusController(req: Request, res: Response) {
  res.json(await assinaturaService.obterStatus(lojaIdObrigatorio(req)));
}

export async function iniciarCheckoutController(req: Request, res: Response) {
  res.json(await assinaturaService.iniciarCheckout(lojaIdObrigatorio(req), req.body));
}

export async function webhookController(req: Request, res: Response) {
  await assinaturaService.processarWebhook(req.body, req.headers);
  res.status(200).json({ recebido: true });
}

export async function simularController(req: Request, res: Response) {
  const { checkoutId, aprovado } = req.body as { checkoutId: string; aprovado: boolean };
  await assinaturaService.simularAprovacao(checkoutId, aprovado);
  res.status(204).send();
}
