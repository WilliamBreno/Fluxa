import type { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export async function kpisController(req: Request, res: Response) {
  res.json(await dashboardService.kpis(req.usuario!.lojaId!));
}

export async function fluxoCaixaController(req: Request, res: Response) {
  res.json(await dashboardService.fluxoCaixa(req.usuario!.lojaId!));
}

export async function ultimosLancamentosController(req: Request, res: Response) {
  res.json(await dashboardService.ultimosLancamentos(req.usuario!.lojaId!));
}
