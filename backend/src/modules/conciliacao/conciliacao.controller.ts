import type { Request, Response } from "express";
import * as conciliacaoService from "./conciliacao.service";
import { AppError } from "../../middlewares/errorHandler";

function decodificarBase64(conteudoBase64: string): string {
  try {
    return Buffer.from(conteudoBase64, "base64").toString("utf-8");
  } catch {
    throw new AppError("Conteúdo do arquivo em base64 inválido.", 422);
  }
}

export async function uploadExtratoController(req: Request, res: Response) {
  const { adquirente, nomeArquivo, conteudoBase64 } = req.body as {
    adquirente: string;
    nomeArquivo: string;
    conteudoBase64: string;
  };

  const resultado = await conciliacaoService.importarExtrato({
    lojaId: req.usuario!.lojaId!,
    adquirente,
    nomeArquivo,
    conteudoBruto: decodificarBase64(conteudoBase64),
    usuarioId: req.usuario!.id,
  });

  res.status(201).json(resultado);
}

export async function confirmarMapeamentoController(req: Request, res: Response) {
  const { conteudoBase64, mapeamento } = req.body as { conteudoBase64: string; mapeamento: Record<string, string> };

  const resultado = await conciliacaoService.reprocessarComMapeamento({
    extratoId: req.params.id,
    lojaId: req.usuario!.lojaId!,
    conteudoBruto: decodificarBase64(conteudoBase64),
    mapeamentoManual: mapeamento,
    usuarioId: req.usuario!.id,
  });

  res.json(resultado);
}

export async function listarExtratosController(req: Request, res: Response) {
  res.json(await conciliacaoService.listarExtratos(req.usuario!.lojaId!));
}

export async function listarTransacoesController(req: Request, res: Response) {
  res.json(await conciliacaoService.listarTransacoesDoExtrato(req.params.id, req.usuario!.lojaId!));
}

export async function executarConciliacaoController(req: Request, res: Response) {
  const { dataInicio, dataFim } = req.body as { dataInicio: Date; dataFim: Date };
  const resumo = await conciliacaoService.executarConciliacao({
    lojaId: req.usuario!.lojaId!,
    dataInicio,
    dataFim,
    usuarioId: req.usuario!.id,
  });
  res.json(resumo);
}

export async function listarConciliacoesController(req: Request, res: Response) {
  const query = req.query as unknown as { status?: never; dataInicio?: Date; dataFim?: Date };
  res.json(
    await conciliacaoService.listarConciliacoes({
      lojaId: req.usuario!.lojaId!,
      status: query.status,
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
    })
  );
}

export async function resumoController(req: Request, res: Response) {
  res.json(await conciliacaoService.resumo(req.usuario!.lojaId!));
}

export async function resolverManualController(req: Request, res: Response) {
  const { acao, observacao, transacaoExtratoId } = req.body as {
    acao: "aceitar" | "vincular" | "rejeitar";
    observacao: string;
    transacaoExtratoId?: string;
  };

  const resultado = await conciliacaoService.resolverManual({
    conciliacaoId: req.params.id,
    lojaId: req.usuario!.lojaId!,
    usuarioId: req.usuario!.id,
    acao,
    observacao,
    transacaoExtratoId,
  });

  res.json(resultado);
}

export async function listarTaxasController(req: Request, res: Response) {
  res.json(await conciliacaoService.listarTaxas(req.usuario!.lojaId!));
}

export async function definirTaxaController(req: Request, res: Response) {
  const { bandeira, modalidade, parcelas, taxaPercentual } = req.body as {
    bandeira: never;
    modalidade: never;
    parcelas: number;
    taxaPercentual: number;
  };
  const taxa = await conciliacaoService.definirTaxa({
    lojaId: req.usuario!.lojaId!,
    bandeira,
    modalidade,
    parcelas,
    taxaPercentual,
  });
  res.status(201).json(taxa);
}

export async function alertasTaxaController(req: Request, res: Response) {
  const { dataInicio, dataFim } = req.query as unknown as { dataInicio: Date; dataFim: Date };
  res.json(await conciliacaoService.taxaEfetivaVsContratada(req.usuario!.lojaId!, dataInicio, dataFim));
}

export async function recebiveisController(req: Request, res: Response) {
  const { dataInicio, dataFim } = req.query as unknown as { dataInicio: Date; dataFim: Date };
  res.json(await conciliacaoService.agendaRecebiveis(req.usuario!.lojaId!, dataInicio, dataFim));
}
