import { z } from "zod";
import { Bandeira, ModalidadeCartao, StatusConciliacaoMovimentacao } from "@prisma/client";

const campoLogicoSchema = z.enum([
  "nsu",
  "autorizacao",
  "bandeira",
  "modalidade",
  "valorBruto",
  "valorLiquido",
  "valorTaxa",
  "dataVenda",
  "dataPagamento",
  "parcelas",
]);

export const mapeamentoColunasSchema = z.record(campoLogicoSchema, z.string());

export const uploadExtratoSchema = z.object({
  adquirente: z.string().min(1).max(50),
  nomeArquivo: z.string().min(1).max(200),
  conteudoBase64: z.string().min(1),
});

export const confirmarMapeamentoBodySchema = z.object({
  conteudoBase64: z.string().min(1),
  mapeamento: mapeamentoColunasSchema,
});

export const executarConciliacaoSchema = z.object({
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
});

export const listarConciliacoesQuerySchema = z.object({
  status: z.nativeEnum(StatusConciliacaoMovimentacao).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export const resolverManualSchema = z.object({
  acao: z.enum(["aceitar", "vincular", "rejeitar"]),
  observacao: z.string().min(3).max(500),
  transacaoExtratoId: z.string().uuid().optional(),
});

export const definirTaxaSchema = z.object({
  bandeira: z.nativeEnum(Bandeira),
  modalidade: z.nativeEnum(ModalidadeCartao),
  parcelas: z.coerce.number().int().min(1).max(24).default(1),
  taxaPercentual: z.coerce.number().min(0).max(100),
});

export const periodoQuerySchema = z.object({
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
});
