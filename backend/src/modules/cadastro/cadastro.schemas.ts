import { z } from "zod";
import { validarCpfCnpj } from "../../utils/cpfCnpj.util";

export const SEGMENTOS = ["VAREJO", "ALIMENTACAO", "SERVICOS", "BELEZA", "OUTRO"] as const;

export const cadastroSchema = z.object({
  responsavel: z.object({
    nome: z.string().min(3, "Informe o nome completo."),
    email: z.string().email(),
    telefone: z.string().min(10, "Informe um telefone/WhatsApp válido com DDD."),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  }),
  negocio: z.object({
    nome: z.string().min(2, "Informe o nome do negócio."),
    documento: z.string().refine(validarCpfCnpj, "CPF ou CNPJ inválido."),
    segmento: z.enum(SEGMENTOS),
  }),
});
