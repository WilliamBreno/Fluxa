import { z } from "zod";
import { PeriodoTurno } from "@prisma/client";

export const abrirTurnoSchema = z.object({
  terminalId: z.string().uuid(),
  periodo: z.nativeEnum(PeriodoTurno),
  fundoTrocoInformado: z.coerce.number().nonnegative(),
  observacoesAbertura: z.string().max(500).optional(),
});

export const trocarOperadorSchema = z.object({
  operadorNovoId: z.string().uuid(),
  motivo: z.string().max(300).optional(),
});

export const listarTurnosQuerySchema = z.object({
  terminalId: z.string().uuid().optional(),
  status: z.enum(["ABERTO", "FECHADO"]).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export const sugestaoFundoTrocoQuerySchema = z.object({
  terminalId: z.string().uuid(),
});
