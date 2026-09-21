import { z } from "zod";
import { FormaPagamento, TipoMovimentacao } from "@prisma/client";

export const criarMovimentacaoSchema = z
  .object({
    tipo: z.nativeEnum(TipoMovimentacao),
    formaPagamento: z.nativeEnum(FormaPagamento).optional(),
    valor: z.coerce.number().positive(),
    motivo: z.string().max(300).optional(),
    descricao: z.string().max(300).optional(),
    vendaReferenciaId: z.string().uuid().optional(),
    // Gerada no cliente (fila offline) antes de qualquer tentativa de rede —
    // reenviar a mesma operação (retry de rede, ou volta de uma sessão
    // expirada) nunca duplica o lançamento. Ver movimentacoes.service.ts::criar.
    chaveIdempotencia: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "VENDA" && !data.formaPagamento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["formaPagamento"],
        message: "Forma de pagamento é obrigatória para vendas.",
      });
    }
    if ((data.tipo === "SANGRIA" || data.tipo === "SUPRIMENTO") && !data.motivo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: "Motivo é obrigatório para sangria/suprimento.",
      });
    }
    if ((data.tipo === "CANCELAMENTO" || data.tipo === "DEVOLUCAO") && !data.vendaReferenciaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vendaReferenciaId"],
        message: "Cancelamento/devolução precisa referenciar a venda original.",
      });
    }
    if (data.tipo === "AJUSTE" && !data.motivo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: "Motivo é obrigatório para lançamentos de ajuste manual.",
      });
    }
  });

export const listarMovimentacoesQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(200).default(50),
});
