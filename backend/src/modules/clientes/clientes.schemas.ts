import { z } from "zod";
import { validarCpfCnpj } from "../../utils/cpfCnpj.util";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const somenteDigitos = (v: string | null) => (v ? v.replace(/\D/g, "") || null : null);

const camposCliente = {
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(150),
  cpf: textoOpcional(20)
    .transform(somenteDigitos)
    .refine((v) => v === null || (v.length === 11 && validarCpfCnpj(v)), "CPF inválido."),
  telefone: textoOpcional(20)
    .transform(somenteDigitos)
    .refine((v) => v === null || (v.length >= 10 && v.length <= 13), "Telefone deve ter DDD + número."),
  email: textoOpcional(150).refine((v) => v === null || z.string().email().safeParse(v).success, "E-mail inválido."),
  dataNascimento: z.coerce.date().optional().nullable(),
  cep: textoOpcional(9).transform(somenteDigitos),
  logradouro: textoOpcional(200),
  numero: textoOpcional(20),
  complemento: textoOpcional(100),
  bairro: textoOpcional(100),
  cidade: textoOpcional(100),
  uf: textoOpcional(2).transform((v) => (v ? v.toUpperCase() : null)),
  origem: textoOpcional(60),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(15)
    .optional()
    .transform((tags) => (tags ? Array.from(new Set(tags.map((t) => t.toLowerCase()))) : undefined)),
  observacoes: textoOpcional(2000),
};

export const criarClienteSchema = z.object(camposCliente);

export const atualizarClienteSchema = z
  .object({ ...camposCliente, ativo: z.boolean() })
  .partial();

export const listarClientesQuerySchema = z.object({
  busca: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(30).optional(),
  status: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
  ordenar: z.enum(["nome", "recentes", "ultimaVisita"]).default("nome"),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(100).default(25),
});

export const criarNotaSchema = z.object({
  texto: z.string().trim().min(1, "Escreva a anotação.").max(2000),
});

export type CriarClienteInput = z.infer<typeof criarClienteSchema>;
export type AtualizarClienteInput = z.infer<typeof atualizarClienteSchema>;
export type ListarClientesQuery = z.infer<typeof listarClientesQuerySchema>;
