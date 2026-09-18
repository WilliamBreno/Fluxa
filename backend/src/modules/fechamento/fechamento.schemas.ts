import { z } from "zod";
import { FormaPagamento } from "@prisma/client";

export const registrarContagemSchema = z.object({
  contagens: z
    .array(
      z.object({
        formaPagamento: z.nativeEnum(FormaPagamento),
        valorContado: z.coerce.number().nonnegative(),
      })
    )
    .min(1, "Informe ao menos uma forma de pagamento contada.")
    .refine(
      (itens) => new Set(itens.map((i) => i.formaPagamento)).size === itens.length,
      "Não é permitido informar a mesma forma de pagamento duas vezes."
    ),
});

export const confirmarFechamentoSchema = z.object({
  causaDivergencia: z.string().max(500).optional(),
  gerarAjusteAutomatico: z.boolean().default(false),
  observacoesFechamento: z.string().max(500).optional(),
});
