import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import * as auditoriaService from "../auditoria/auditoria.service";
import { emitirSessao } from "../auth/auth.service";
import { normalizarCpfCnpj } from "../../utils/cpfCnpj.util";

const DIAS_TRIAL = 3;

interface CadastroInput {
  responsavel: { nome: string; email: string; telefone: string; senha: string };
  negocio: { nome: string; documento: string; segmento: string };
  ip?: string;
}

export async function cadastrar(input: CadastroInput) {
  const emailExistente = await prisma.usuario.findUnique({ where: { email: input.responsavel.email } });
  if (emailExistente) throw new AppError("Já existe uma conta com este e-mail.", 409);

  const documento = normalizarCpfCnpj(input.negocio.documento);
  const documentoExistente = await prisma.loja.findUnique({ where: { cnpj: documento } });
  if (documentoExistente) throw new AppError("Já existe um negócio cadastrado com este CNPJ/CPF.", 409);

  const senhaHash = await bcrypt.hash(input.responsavel.senha, 10);
  const trialFim = new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000);

  const { usuario, loja } = await prisma.$transaction(async (tx) => {
    const loja = await tx.loja.create({
      data: {
        nome: input.negocio.nome,
        cnpj: documento,
        segmento: input.negocio.segmento,
        configuracao: { create: {} },
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        nome: input.responsavel.nome,
        email: input.responsavel.email,
        telefone: input.responsavel.telefone,
        senhaHash,
        roleGlobal: "GERENTE",
        superAdmin: false,
        lojas: { create: { lojaId: loja.id, role: "GERENTE" } },
      },
      include: { lojas: { include: { loja: true } } },
    });

    await tx.assinatura.create({ data: { lojaId: loja.id, status: "TRIAL", trialFim } });

    return { usuario, loja };
  });

  await auditoriaService.registrar({
    lojaId: loja.id,
    usuarioId: usuario.id,
    acao: "CONTA_CRIADA",
    entidade: "Loja",
    entidadeId: loja.id,
    detalhes: { segmento: input.negocio.segmento, trialFim },
    ip: input.ip,
  });

  const sessao = await emitirSessao(usuario, input.ip);
  return { ...sessao, lojaId: loja.id };
}
