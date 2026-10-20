import { z } from "zod";

export const simularSchema = z.object({
  checkoutId: z.string().min(1).max(200),
  aprovado: z.boolean(),
});

export const iniciarCheckoutSchema = z.object({
  planoId: z.string().uuid(),
  ciclo: z.enum(["MENSAL", "ANUAL"]),
});
