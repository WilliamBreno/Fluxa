import { z } from "zod";

export const atualizarConfiguracaoSchema = z.object({
  tetoGavetaDinheiro: z.coerce.number().nonnegative().optional(),
  toleranciaDivergencia: z.coerce.number().nonnegative().optional(),
  valorMinimoConferenciaCruzada: z.coerce.number().nonnegative().optional(),
  horaFechamentoAutomatico: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm")
    .optional(),
  fecharAutomaticamenteSemContagem: z.boolean().optional(),
  diasHistoricoMediaTroco: z.coerce.number().int().min(1).max(365).optional(),
  emailsGestorResumoDiario: z.array(z.string().email()).optional(),
});
