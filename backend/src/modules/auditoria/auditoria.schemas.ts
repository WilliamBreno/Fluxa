import { z } from "zod";
import { AcaoAuditoria } from "@prisma/client";

export const listarAuditoriaQuerySchema = z.object({
  usuarioId: z.string().uuid().optional(),
  acao: z.nativeEnum(AcaoAuditoria).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(200).default(50),
});
