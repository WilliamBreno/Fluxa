import { z } from "zod";
import { FormaPagamento, TipoMovimentacao } from "@prisma/client";

export const formatoExportacaoSchema = z.object({
  formato: z.enum(["json", "pdf", "xlsx", "csv"]).default("json"),
});

export const comparativoQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  agruparPor: z.enum(["operador", "terminal", "dia"]).default("dia"),
});

export const exportacaoContabilQuerySchema = z.object({
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  formato: z.enum(["json", "xlsx", "csv"]).default("json"),
});

export const periodoOpcionalQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  formato: z.enum(["json", "csv"]).default("json"),
});

export const vendasPorFormaQuerySchema = z.object({
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  agrupamento: z.enum(["hora", "dia"]).default("dia"),
  terminalId: z.string().uuid().optional(),
  formato: z.enum(["json", "csv"]).default("json"),
});

export const movimentacoesFiltradasQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  terminalId: z.string().uuid().optional(),
  operadorId: z.string().uuid().optional(),
  formaPagamento: z.nativeEnum(FormaPagamento).optional(),
  tipo: z.nativeEnum(TipoMovimentacao).optional(),
  formato: z.enum(["json", "csv"]).default("json"),
});

export const estornosQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  terminalId: z.string().uuid().optional(),
  formato: z.enum(["json", "csv"]).default("json"),
});
