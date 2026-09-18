import type { Request, Response } from "express";
import * as auditoriaService from "./auditoria.service";

export async function listarAuditoria(req: Request, res: Response) {
  const query = req.query as unknown as {
    usuarioId?: string;
    acao?: never;
    dataInicio?: Date;
    dataFim?: Date;
    pagina: number;
    tamanhoPagina: number;
  };

  const resultado = await auditoriaService.listar({
    lojaId: req.usuario?.lojaId,
    usuarioId: query.usuarioId,
    acao: req.query.acao as never,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    pagina: query.pagina,
    tamanhoPagina: query.tamanhoPagina,
  });

  res.json(resultado);
}
