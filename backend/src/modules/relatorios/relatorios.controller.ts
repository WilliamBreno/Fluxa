import type { Request, Response } from "express";
import * as relatoriosService from "./relatorios.service";
import { gerarPdfReducaoZ } from "./pdf/reducaoZ.pdf";
import { gerarExcelContabil, gerarExcelFechamento } from "./excel/exportacao.xlsx";
import { gerarCsvBr } from "./csv/csv.util";
import * as auditoriaService from "../auditoria/auditoria.service";

function enviarCsv(res: Response, buffer: Buffer, nomeArquivo: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.send(buffer);
}

async function registrarExportacao(req: Request, detalhes: Record<string, unknown>) {
  await auditoriaService.registrar({
    lojaId: req.usuario?.lojaId,
    usuarioId: req.usuario!.id,
    acao: "EXPORTACAO_RELATORIO",
    entidade: "Relatorio",
    detalhes,
  });
}

export async function buscarFechamentoController(req: Request, res: Response) {
  const relatorio = await relatoriosService.buscarFechamento(req.params.turnoId);
  const { formato } = req.query as { formato: "json" | "pdf" | "xlsx" | "csv" };
  const conteudo = relatorio.conteudoJson as never as {
    contagens: { formaPagamento: string; valorContado: string; valorEsperado?: string; divergencia?: string; classificacao?: string | null }[];
  };

  await auditoriaService.registrar({
    lojaId: req.usuario?.lojaId,
    usuarioId: req.usuario!.id,
    acao: "EXPORTACAO_RELATORIO",
    entidade: "RelatorioFechamento",
    entidadeId: relatorio.id,
    detalhes: { formato },
  });

  if (formato === "pdf") {
    const pdf = await gerarPdfReducaoZ(conteudo as never, relatorio.numeroSequencial, relatorio.hashIntegridade);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="fechamento-${relatorio.numeroSequencial}.pdf"`);
    return res.send(pdf);
  }

  if (formato === "xlsx") {
    const xlsx = await gerarExcelFechamento(conteudo as never);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="fechamento-${relatorio.numeroSequencial}.xlsx"`);
    return res.send(xlsx);
  }

  if (formato === "csv") {
    const csv = gerarCsvBr(conteudo.contagens, [
      { chave: "formaPagamento", cabecalho: "Forma de pagamento" },
      { chave: "valorContado", cabecalho: "Valor contado" },
      { chave: "valorEsperado", cabecalho: "Valor esperado" },
      { chave: "divergencia", cabecalho: "Divergência" },
      { chave: "classificacao", cabecalho: "Classificação" },
    ]);
    return enviarCsv(res, csv, `fechamento-${relatorio.numeroSequencial}.csv`);
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
  const query = req.query as unknown as { dataInicio: Date; dataFim: Date; formato: "json" | "xlsx" | "csv" };
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

  if (query.formato === "csv") {
    await registrarExportacao(req, { relatorio: "exportacao-contabil", formato: "csv" });
    const csv = gerarCsvBr(linhas, [
      { chave: "data", cabecalho: "Data" },
      { chave: "totalVendas", cabecalho: "Total de vendas" },
      { chave: "totalSangrias", cabecalho: "Sangrias" },
      { chave: "totalSuprimentos", cabecalho: "Suprimentos" },
      ...(["DINHEIRO", "DEBITO", "CREDITO", "PIX", "VALE", "FIADO", "OUTRO"] as const).map((forma) => ({
        chave: forma,
        cabecalho: forma,
        formatar: (linha: (typeof linhas)[number]) => linha.totalPorForma[forma],
      })),
    ]);
    return enviarCsv(res, csv, "exportacao-contabil.csv");
  }

  res.json(linhas);
}

export async function alertasDivergenciaController(req: Request, res: Response) {
  res.json(await relatoriosService.alertasDivergenciaRecorrente(req.usuario!.lojaId!));
}

export async function divergenciaPorOperadorController(req: Request, res: Response) {
  const query = req.query as unknown as { dataInicio?: Date; dataFim?: Date; formato: "json" | "csv" };
  const linhas = await relatoriosService.divergenciaPorOperador({
    lojaId: req.usuario!.lojaId!,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
  });

  if (query.formato === "csv") {
    await registrarExportacao(req, { relatorio: "divergencia-por-operador", formato: "csv" });
    const csv = gerarCsvBr(linhas, [
      { chave: "operadorNome", cabecalho: "Operador" },
      { chave: "quantidadeTurnos", cabecalho: "Turnos fechados" },
      { chave: "divergenciaMedia", cabecalho: "Divergência média" },
      { chave: "divergenciaMaxima", cabecalho: "Divergência máxima" },
      { chave: "turnosComFalta", cabecalho: "Turnos com falta" },
      { chave: "turnosComSobra", cabecalho: "Turnos com sobra" },
      { chave: "tendencia", cabecalho: "Tendência" },
    ]);
    return enviarCsv(res, csv, "divergencia-por-operador.csv");
  }

  res.json(linhas);
}

export async function vendasPorFormaController(req: Request, res: Response) {
  const query = req.query as unknown as {
    dataInicio: Date;
    dataFim: Date;
    agrupamento: "hora" | "dia";
    terminalId?: string;
    formato: "json" | "csv";
  };
  const linhas = await relatoriosService.vendasPorFormaPeriodo({
    lojaId: req.usuario!.lojaId!,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    agrupamento: query.agrupamento,
    terminalId: query.terminalId,
  });

  if (query.formato === "csv") {
    await registrarExportacao(req, { relatorio: "vendas-por-forma", formato: "csv" });
    const csv = gerarCsvBr(linhas, [
      { chave: "periodo", cabecalho: "Período" },
      { chave: "quantidade", cabecalho: "Qtde. vendas" },
      { chave: "total", cabecalho: "Total" },
      ...(["DINHEIRO", "DEBITO", "CREDITO", "PIX", "VALE", "FIADO", "OUTRO"] as const).map((forma) => ({
        chave: forma,
        cabecalho: forma,
        formatar: (linha: (typeof linhas)[number]) => linha.porForma[forma],
      })),
    ]);
    return enviarCsv(res, csv, "vendas-por-forma.csv");
  }

  res.json(linhas);
}

export async function movimentacoesFiltradasController(req: Request, res: Response) {
  const query = req.query as unknown as {
    dataInicio?: Date;
    dataFim?: Date;
    terminalId?: string;
    operadorId?: string;
    formaPagamento?: never;
    tipo?: never;
    formato: "json" | "csv";
  };
  const linhas = await relatoriosService.movimentacoesFiltradas({
    lojaId: req.usuario!.lojaId!,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    terminalId: query.terminalId,
    operadorId: query.operadorId,
    formaPagamento: req.query.formaPagamento as never,
    tipo: req.query.tipo as never,
  });

  if (query.formato === "csv") {
    await registrarExportacao(req, { relatorio: "movimentacoes", formato: "csv" });
    const csv = gerarCsvBr(linhas, [
      { chave: "createdAt", cabecalho: "Data/hora" },
      { chave: "tipo", cabecalho: "Tipo" },
      { chave: "formaPagamento", cabecalho: "Forma" },
      { chave: "valor", cabecalho: "Valor" },
      { chave: "operador", cabecalho: "Operador", formatar: (l) => l.operador.nome },
      { chave: "autorizadoPor", cabecalho: "Autorizado por", formatar: (l) => l.autorizadoPor?.nome ?? "" },
      { chave: "motivo", cabecalho: "Motivo" },
      { chave: "terminal", cabecalho: "Terminal", formatar: (l) => l.turno.terminal.nome },
      { chave: "turno", cabecalho: "Turno nº", formatar: (l) => l.turno.numeroSequencial },
    ]);
    return enviarCsv(res, csv, "movimentacoes.csv");
  }

  res.json(linhas);
}

export async function estornosController(req: Request, res: Response) {
  const query = req.query as unknown as {
    dataInicio?: Date;
    dataFim?: Date;
    terminalId?: string;
    formato: "json" | "csv";
  };
  const linhas = await relatoriosService.estornos({
    lojaId: req.usuario!.lojaId!,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    terminalId: query.terminalId,
  });

  if (query.formato === "csv") {
    await registrarExportacao(req, { relatorio: "estornos", formato: "csv" });
    const csv = gerarCsvBr(linhas, [
      { chave: "createdAt", cabecalho: "Data/hora" },
      { chave: "tipo", cabecalho: "Tipo" },
      { chave: "valor", cabecalho: "Valor" },
      { chave: "operador", cabecalho: "Operador", formatar: (l) => l.operador.nome },
      { chave: "motivo", cabecalho: "Motivo" },
      { chave: "vendaOriginalValor", cabecalho: "Valor da venda original", formatar: (l) => l.vendaReferencia?.valor ?? "" },
      {
        chave: "vendaOriginalForma",
        cabecalho: "Forma da venda original",
        formatar: (l) => l.vendaReferencia?.formaPagamento ?? "",
      },
    ]);
    return enviarCsv(res, csv, "estornos.csv");
  }

  res.json(linhas);
}
