import { z } from "zod";

export const criarTerminalSchema = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(1).max(100),
});
