import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
  lojaId: z.string().uuid().optional(),
});
