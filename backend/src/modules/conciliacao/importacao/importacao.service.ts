import { Bandeira, ModalidadeCartao, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../middlewares/errorHandler";
import { sha256Texto } from "../../../utils/hash";
import * as auditoriaService from "../../auditoria/auditoria.service";
import { detectarColunas, type MapeamentoColunas } from "./colunas.detector";
import type { CampoLogico } from "./colunas.dicionario";
import { paraDataBr, paraNumeroBr, parseCsvBruto } from "./csv.parser";

const CAMPOS_OBRIGATORIOS: CampoLogico[] = ["valorBruto", "dataVenda", "dataPagamento"];

function inferirBandeira(texto: string | undefined): Bandeira {
  const normalizado = (texto ?? "").toUpperCase();
  if (normalizado.includes("MASTER")) return "MASTERCARD";
  if (normalizado.includes("VISA")) return "VISA";
  if (normalizado.includes("ELO")) return "ELO";
  if (normalizado.includes("AMEX") || normalizado.includes("AMERICAN")) return "AMEX";
  if (normalizado.includes("HIPER")) return "HIPERCARD";
  return "OUTRA";
}

function inferirParcelas(texto: string | undefined): { parcelas: number; numeroParcela: number } {
  if (!texto) return { parcelas: 1, numeroParcela: 1 };
  const combinado = texto.match(/(\d+)\s*\/\s*(\d+)/);
  if (combinado) return { numeroParcela: Number(combinado[1]), parcelas: Number(combinado[2]) };
  const numero = Number(texto.replace(/\D/g, ""));
  return { parcelas: Number.isFinite(numero) && numero > 0 ? numero : 1, numeroParcela: 1 };
}

function inferirModalidade(texto: string | undefined, parcelas: number): ModalidadeCartao {
  const normalizado = (texto ?? "").toUpperCase();
  if (normalizado.includes("DEBITO") || normalizado.includes("DÉBITO")) return "DEBITO";
  if (parcelas > 1) return "CREDITO_PARCELADO";
  return "CREDITO_A_VISTA";
}

/** Cria uma TransacaoExtratoCartao a partir de uma linha bruta do CSV já mapeada. Lança se faltar valor obrigatório. */
async function criarLinhaTransacao(
  tx: Prisma.TransactionClient,
  extratoId: string,
  lojaId: string,
  linha: Record<string, string>,
  mapeamento: MapeamentoColunas
) {
  const valorBrutoTexto = mapeamento.valorBruto ? linha[mapeamento.valorBruto] : undefined;
  const dataVendaTexto = mapeamento.dataVenda ? linha[mapeamento.dataVenda] : undefined;
  const dataPagamentoTexto = mapeamento.dataPagamento ? linha[mapeamento.dataPagamento] : undefined;
  if (!valorBrutoTexto || !dataVendaTexto || !dataPagamentoTexto) {
    throw new Error("valores obrigatórios ausentes nesta linha");
  }

  const valorBruto = paraNumeroBr(valorBrutoTexto);
  const valorTaxaTexto = mapeamento.valorTaxa ? linha[mapeamento.valorTaxa] : undefined;
  const valorLiquidoTexto = mapeamento.valorLiquido ? linha[mapeamento.valorLiquido] : undefined;
  const valorTaxa = valorTaxaTexto ? paraNumeroBr(valorTaxaTexto) : 0;
  const valorLiquido = valorLiquidoTexto ? paraNumeroBr(valorLiquidoTexto) : valorBruto - valorTaxa;

  const { parcelas, numeroParcela } = inferirParcelas(mapeamento.parcelas ? linha[mapeamento.parcelas] : undefined);

  await tx.transacaoExtratoCartao.create({
    data: {
      extratoId,
      lojaId,
      nsu: mapeamento.nsu ? linha[mapeamento.nsu] || null : null,
      autorizacao: mapeamento.autorizacao ? linha[mapeamento.autorizacao] || null : null,
      bandeira: inferirBandeira(mapeamento.bandeira ? linha[mapeamento.bandeira] : undefined),
      modalidade: inferirModalidade(mapeamento.modalidade ? linha[mapeamento.modalidade] : undefined, parcelas),
      parcelas,
      numeroParcela,
      valorBruto: new Prisma.Decimal(valorBruto.toFixed(2)),
      valorLiquido: new Prisma.Decimal(valorLiquido.toFixed(2)),
      valorTaxa: new Prisma.Decimal(valorTaxa.toFixed(2)),
      dataVenda: paraDataBr(dataVendaTexto),
      dataPagamentoPrevista: paraDataBr(dataPagamentoTexto),
      linhaOriginal: linha as Prisma.InputJsonValue,
    },
  });
}

export interface ImportarExtratoInput {
  lojaId: string;
  adquirente: string;
  nomeArquivo: string;
  conteudoBruto: string;
  usuarioId: string;
  mapeamentoManual?: MapeamentoColunas;
}

export interface ResultadoImportacao {
  extratoId: string;
  status: "PROCESSANDO" | "CONCLUIDO" | "ERRO";
  totalLinhas: number;
  totalImportadas: number;
  erro?: string;
  cabecalhosDisponiveis?: string[];
  mapeamentoSugerido?: MapeamentoColunas;
}

export async function importarExtrato(input: ImportarExtratoInput): Promise<ResultadoImportacao> {
  const hashArquivo = sha256Texto(input.conteudoBruto);

  const existente = await prisma.extratoCartao.findUnique({
    where: { lojaId_hashArquivo: { lojaId: input.lojaId, hashArquivo } },
  });
  if (existente) {
    throw new AppError("Este arquivo já foi importado antes (mesmo conteúdo) — reimportação rejeitada.", 409);
  }

  const { cabecalhos, linhas } = parseCsvBruto(input.conteudoBruto);
  if (cabecalhos.length === 0) {
    throw new AppError("Não foi possível ler nenhuma linha do arquivo enviado.", 422);
  }

  const deteccao = detectarColunas(cabecalhos);
  const mapeamento: MapeamentoColunas = { ...deteccao.mapeamento, ...input.mapeamentoManual };
  const camposFaltando = CAMPOS_OBRIGATORIOS.filter((campo) => !mapeamento[campo]);

  if (camposFaltando.length > 0) {
    const extrato = await prisma.extratoCartao.create({
      data: {
        lojaId: input.lojaId,
        adquirente: input.adquirente,
        nomeArquivo: input.nomeArquivo,
        hashArquivo,
        mapeamentoColunas: mapeamento,
        status: "ERRO",
        totalLinhas: linhas.length,
        totalImportadas: 0,
        erro: `Colunas obrigatórias não detectadas: ${camposFaltando.join(", ")}. Confirme o mapeamento manualmente.`,
        importadoPorId: input.usuarioId,
      },
    });
    return {
      extratoId: extrato.id,
      status: "ERRO",
      totalLinhas: linhas.length,
      totalImportadas: 0,
      erro: extrato.erro ?? undefined,
      cabecalhosDisponiveis: cabecalhos,
      mapeamentoSugerido: mapeamento,
    };
  }

  return processarLinhas(input, hashArquivo, linhas, mapeamento);
}

export interface ReprocessarComMapeamentoInput {
  extratoId: string;
  lojaId: string;
  conteudoBruto: string;
  mapeamentoManual: MapeamentoColunas;
  usuarioId: string;
}

/**
 * Confirma o mapeamento manual de colunas para um extrato que ficou em ERRO
 * por detecção automática incompleta. O frontend reenvia o MESMO arquivo (o
 * servidor não guarda o CSV bruto depois do upload inicial) — o hash é
 * conferido de novo para garantir que é o mesmo conteúdo, não um arquivo
 * diferente disfarçado de "correção de mapeamento".
 */
export async function reprocessarComMapeamento(input: ReprocessarComMapeamentoInput): Promise<ResultadoImportacao> {
  const extrato = await prisma.extratoCartao.findUnique({ where: { id: input.extratoId } });
  if (!extrato || extrato.lojaId !== input.lojaId) {
    throw new AppError("Extrato não encontrado.", 404);
  }
  if (extrato.status !== "ERRO") {
    throw new AppError("Este extrato já foi processado — não é possível reprocessar.", 409);
  }

  const hashConferencia = sha256Texto(input.conteudoBruto);
  if (hashConferencia !== extrato.hashArquivo) {
    throw new AppError("O arquivo reenviado não é o mesmo que foi importado originalmente.", 422);
  }

  const { linhas } = parseCsvBruto(input.conteudoBruto);
  const camposFaltando = CAMPOS_OBRIGATORIOS.filter((campo) => !input.mapeamentoManual[campo]);
  if (camposFaltando.length > 0) {
    throw new AppError(`Ainda faltam colunas obrigatórias no mapeamento: ${camposFaltando.join(", ")}.`, 422);
  }

  await prisma.extratoCartao.update({
    where: { id: extrato.id },
    data: { mapeamentoColunas: input.mapeamentoManual, erro: null },
  });

  return processarLinhasExistente(extrato.id, input.lojaId, input.usuarioId, extrato.nomeArquivo, linhas, input.mapeamentoManual);
}

async function processarLinhasExistente(
  extratoId: string,
  lojaId: string,
  usuarioId: string,
  nomeArquivo: string,
  linhas: Record<string, string>[],
  mapeamento: MapeamentoColunas
): Promise<ResultadoImportacao> {
  let importadas = 0;
  const erros: string[] = [];

  const extrato = await prisma.$transaction(async (tx) => {
    for (const [indice, linha] of linhas.entries()) {
      try {
        await criarLinhaTransacao(tx, extratoId, lojaId, linha, mapeamento);
        importadas += 1;
      } catch (err) {
        erros.push(`Linha ${indice + 2}: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      }
    }

    return tx.extratoCartao.update({
      where: { id: extratoId },
      data: {
        status: erros.length === linhas.length && linhas.length > 0 ? "ERRO" : "CONCLUIDO",
        totalImportadas: importadas,
        erro: erros.length > 0 ? erros.slice(0, 20).join(" | ") : null,
      },
    });
  });

  await auditoriaService.registrar({
    lojaId,
    usuarioId,
    acao: "IMPORTACAO_EXTRATO_CARTAO",
    entidade: "ExtratoCartao",
    entidadeId: extrato.id,
    detalhes: { nomeArquivo, totalLinhas: linhas.length, totalImportadas: importadas, reprocessado: true },
  });

  return {
    extratoId: extrato.id,
    status: extrato.status,
    totalLinhas: linhas.length,
    totalImportadas: importadas,
    erro: extrato.erro ?? undefined,
  };
}

async function processarLinhas(
  input: ImportarExtratoInput,
  hashArquivo: string,
  linhas: Record<string, string>[],
  mapeamento: MapeamentoColunas
): Promise<ResultadoImportacao> {
  let importadas = 0;
  const erros: string[] = [];

  const extrato = await prisma.$transaction(async (tx) => {
    const extratoCriado = await tx.extratoCartao.create({
      data: {
        lojaId: input.lojaId,
        adquirente: input.adquirente,
        nomeArquivo: input.nomeArquivo,
        hashArquivo,
        mapeamentoColunas: mapeamento,
        status: "PROCESSANDO",
        totalLinhas: linhas.length,
        importadoPorId: input.usuarioId,
      },
    });

    for (const [indice, linha] of linhas.entries()) {
      try {
        await criarLinhaTransacao(tx, extratoCriado.id, input.lojaId, linha, mapeamento);
        importadas += 1;
      } catch (err) {
        erros.push(`Linha ${indice + 2}: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      }
    }

    return tx.extratoCartao.update({
      where: { id: extratoCriado.id },
      data: {
        status: erros.length === linhas.length && linhas.length > 0 ? "ERRO" : "CONCLUIDO",
        totalImportadas: importadas,
        erro: erros.length > 0 ? erros.slice(0, 20).join(" | ") : null,
      },
    });
  });

  await auditoriaService.registrar({
    lojaId: input.lojaId,
    usuarioId: input.usuarioId,
    acao: "IMPORTACAO_EXTRATO_CARTAO",
    entidade: "ExtratoCartao",
    entidadeId: extrato.id,
    detalhes: { nomeArquivo: input.nomeArquivo, totalLinhas: linhas.length, totalImportadas: importadas },
  });

  return {
    extratoId: extrato.id,
    status: extrato.status,
    totalLinhas: linhas.length,
    totalImportadas: importadas,
    erro: extrato.erro ?? undefined,
  };
}
