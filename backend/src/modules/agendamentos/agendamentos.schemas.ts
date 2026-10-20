import { z } from "zod";
import { StatusAgendamento } from "@prisma/client";
import { DURACAO_MAXIMA_MINUTOS } from "./agendamentos.regras";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const intervaloValido = (d: { inicio?: Date; fim?: Date }) =>
  !d.inicio || !d.fim || (d.fim > d.inicio && d.fim.getTime() - d.inicio.getTime() <= DURACAO_MAXIMA_MINUTOS * 60_000);

const MENSAGEM_INTERVALO = `O término precisa ser depois do início, com duração máxima de ${DURACAO_MAXIMA_MINUTOS / 60} horas.`;

export const criarAgendamentoSchema = z
  .object({
    clienteId: z.string().uuid("Selecione o cliente."),
    servicoId: z.string().uuid().optional().nullable(),
    profissionalId: z.string().uuid().optional().nullable(),
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    valor: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
    observacoes: textoOpcional(1000),
  })
  .refine(intervaloValido, { message: MENSAGEM_INTERVALO, path: ["fim"] });

export const atualizarAgendamentoSchema = z
  .object({
    servicoId: z.string().uuid().nullable(),
    profissionalId: z.string().uuid().nullable(),
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    valor: z.coerce.number().min(0).max(1_000_000).nullable(),
    observacoes: textoOpcional(1000),
  })
  .partial()
  .refine(intervaloValido, { message: MENSAGEM_INTERVALO, path: ["fim"] });

export const alterarStatusSchema = z
  .object({
    status: z.nativeEnum(StatusAgendamento),
    motivo: textoOpcional(500),
  })
  .refine((d) => d.status !== "CANCELADO" || !!d.motivo, {
    message: "Informe o motivo do cancelamento.",
    path: ["motivo"],
  });

export const listarAgendamentosQuerySchema = z
  .object({
    inicio: z.coerce.date(),
    fim: z.coerce.date(),
    profissionalId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    status: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",") : undefined))
      .pipe(z.array(z.nativeEnum(StatusAgendamento)).optional()),
  })
  .refine((d) => d.fim > d.inicio && d.fim.getTime() - d.inicio.getTime() <= 93 * 24 * 60 * 60_000, {
    message: "Período inválido (máximo de 93 dias por consulta).",
  });

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>;
export type AtualizarAgendamentoInput = z.infer<typeof atualizarAgendamentoSchema>;
export type ListarAgendamentosQuery = z.infer<typeof listarAgendamentosQuerySchema>;
