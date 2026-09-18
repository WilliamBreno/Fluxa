import { z } from "zod";

export const formatoExportacaoSchema = z.object({
  formato: z.enum(["json", "pdf", "xlsx"]).default("json"),
});

export const comparativoQuerySchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  agruparPor: z.enum(["operador", "terminal", "dia"]).default("dia"),
});

export const exportacaoContabilQuerySchema = z.object({
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date(),
  formato: z.enum(["json", "xlsx"]).default("json"),
});
