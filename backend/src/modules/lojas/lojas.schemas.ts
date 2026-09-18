import { z } from "zod";

export const criarLojaSchema = z.object({
  nome: z.string().min(2).max(150),
  cnpj: z.string().max(20).optional(),
  endereco: z.string().max(300).optional(),
  timezone: z.string().default("America/Sao_Paulo"),
});
