import { z } from "zod";

export const criarPlanoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  funcionalidades: z.array(z.string()).default([]),
  valorMensal: z.number().positive(),
  valorAnual: z.number().positive(),
  limiteTerminais: z.number().int().positive().nullable().optional(),
  ordem: z.number().int().optional(),
  ativo: z.boolean().optional(),
});

export const atualizarPlanoSchema = criarPlanoSchema.partial();
