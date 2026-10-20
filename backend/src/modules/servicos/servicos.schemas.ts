import { z } from "zod";

const campos = {
  nome: z.string().trim().min(2).max(100),
  descricao: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  duracaoMinutos: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(720),
  preco: z.coerce.number().min(0).max(1_000_000),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #RRGGBB."),
};

export const criarServicoSchema = z.object(campos);
export const atualizarServicoSchema = z.object({ ...campos, ativo: z.boolean() }).partial();

export type CriarServicoInput = z.infer<typeof criarServicoSchema>;
export type AtualizarServicoInput = z.infer<typeof atualizarServicoSchema>;
