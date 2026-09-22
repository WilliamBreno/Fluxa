import { z } from "zod";

export const iniciarCheckoutSchema = z.object({
  planoId: z.string().uuid(),
  ciclo: z.enum(["MENSAL", "ANUAL"]),
});
