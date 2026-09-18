import type { Request, Response } from "express";
import * as relatoriosService from "./relatorios.service";
import { gerarPdfReducaoZ } from "./pdf/reducaoZ.pdf";
import { gerarExcelContabil, gerarExcelFechamento } from "./excel/exportacao.xlsx";
import * as auditoriaService from "../auditoria/auditoria.service";

export async function buscarFechamentoController(req: Request, res: Response) {
  const relatorio = await relatoriosService.buscarFechamento(req.params.turnoId);
  const { formato } = req.query as { formato: "json" | "pdf" | "xlsx" };
  const conteudo = relatorio.conteudoJson as never;

  await auditoriaService.registrar({
    lojaId: req.usuario?.lojaId,
    usuarioId: req.usuario!.id,
    acao: "EXPORTACAO_RELATORIO",
    entidade: "RelatorioFechamento",
    entidadeId: relatorio.id,
    detalhes: { formato },
  });

  if (formato === "pdf") {
    const pdf = await gerarPdfReducaoZ(conteudo, relatorio.numeroSequencial, relatorio.hashIntegridade);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="fechamento-${relatorio.numeroSequencial}.pdf"`);
    return res.send(pdf);
  }

  if (formato === "xlsx") {
    const xlsx = await gerarExcelFechamento(conteudo);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="fechamento-${relatorio.numeroSequencial}.xlsx"`);
    return res.send(xlsx);
  }

  res.json(relatorio);
}

export async function comparativoController(req: Request, res: Response) {
  const query = req.query as unknown as { dataInicio?: Date; dataFim?: Date; agruparPor: "operador" | "terminal" | "dia" };
  res.json(
    await relatoriosService.comparativo({
      lojaId: req.usuario!.lojaId!,
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
      agruparPor: query.agruparPor,
    })
  );
}

export async function previsaoController(req: Request, res: Response) {
  res.json(await relatoriosService.previsaoCaixa(req.usuario!.lojaId!));
}

export async function exportacaoContabilController(req: Request, res: Response) {
  const query = req.query as unknown as { dataInicio: Date; dataFim: Date; formato: "json" | "xlsx" };
  const linhas = await relatoriosService.exportacaoContabil({
    lojaId: req.usuario!.lojaId!,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
  });

  if (query.formato === "xlsx") {
    const xlsx = await gerarExcelContabil(linhas);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="exportacao-contabil.xlsx"');
    return res.send(xlsx);
  }

  res.json(linhas);
}

export async function alertasDivergenciaController(req: Request, res: Response) {
  res.json(await relatoriosService.alertasDivergenciaRecorrente(req.usuario!.lojaId!));
}
