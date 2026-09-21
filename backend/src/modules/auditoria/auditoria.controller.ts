import type { Request, Response } from "express";
import * as auditoriaService from "./auditoria.service";
import { gerarCsvBr } from "../relatorios/csv/csv.util";

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

export async function exportarAuditoria(req: Request, res: Response) {
  const query = req.query as unknown as {
    usuarioId?: string;
    dataInicio?: Date;
    dataFim?: Date;
  };

  const resultado = await auditoriaService.listar({
    lojaId: req.usuario?.lojaId,
    usuarioId: query.usuarioId,
    acao: req.query.acao as never,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    pagina: 1,
    tamanhoPagina: 10000,
  });

  await auditoriaService.registrar({
    lojaId: req.usuario?.lojaId,
    usuarioId: req.usuario!.id,
    acao: "EXPORTACAO_RELATORIO",
    entidade: "AuditLog",
    detalhes: { relatorio: "auditoria", formato: "csv" },
  });

  const csv = gerarCsvBr(resultado.itens, [
    { chave: "createdAt", cabecalho: "Data/hora" },
    { chave: "acao", cabecalho: "Ação" },
    { chave: "usuario", cabecalho: "Usuário", formatar: (l) => l.usuario?.nome ?? "Sistema" },
    { chave: "entidade", cabecalho: "Entidade" },
    { chave: "entidadeId", cabecalho: "Entidade ID" },
  ]);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="auditoria.csv"');
  res.send(csv);
}
