import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Cria a loja, o primeiro terminal e o usuário admin em produção — SEM os
 * usuários/senhas de exemplo do prisma/seed.ts (que são só para dev local).
 * Idempotente: pode rodar de novo sem duplicar nada.
 *
 * Uso (Railway → aba "Command" de um serviço, ou `railway run`):
 *   LOJA_NOME="Minha Loja" ADMIN_NOME="Fulano" ADMIN_EMAIL="fulano@empresa.com" \
 *   ADMIN_SENHA="senha-forte-de-verdade" npx tsx prisma/bootstrap-prod.ts
 */
async function main() {
  const lojaNome = obrigatorio("LOJA_NOME");
  const adminNome = obrigatorio("ADMIN_NOME");
  const adminEmail = obrigatorio("ADMIN_EMAIL");
  const adminSenha = obrigatorio("ADMIN_SENHA");

  if (adminSenha.length < 8) {
    throw new Error("ADMIN_SENHA precisa ter pelo menos 8 caracteres.");
  }

  const loja = await prisma.loja.upsert({
    where: { cnpj: `bootstrap-${adminEmail}` },
    create: {
      nome: lojaNome,
      cnpj: `bootstrap-${adminEmail}`,
      configuracao: { create: {} },
    },
    update: { nome: lojaNome },
  });

  const terminal = await prisma.terminal.upsert({
    where: { lojaId_codigo: { lojaId: loja.id, codigo: "01" } },
    create: { lojaId: loja.id, codigo: "01", nome: "Caixa 1" },
    update: {},
  });

  const senhaHash = await bcrypt.hash(adminSenha, 10);
  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    create: {
      nome: adminNome,
      email: adminEmail,
      senhaHash,
      roleGlobal: "ADMIN",
      superAdmin: true,
    },
    update: { senhaHash, nome: adminNome },
  });

  await prisma.usuarioLoja.upsert({
    where: { usuarioId_lojaId: { usuarioId: admin.id, lojaId: loja.id } },
    create: { usuarioId: admin.id, lojaId: loja.id, role: "ADMIN" },
    update: { role: "ADMIN", ativo: true },
  });

  console.log("Bootstrap de produção concluído:");
  console.log(` - Loja: ${loja.nome} (${loja.id})`);
  console.log(` - Terminal: ${terminal.nome} (código ${terminal.codigo})`);
  console.log(` - Admin: ${admin.email}`);
  console.log("Troque ADMIN_SENHA por uma definitiva se esta foi só provisória, e crie os demais usuários/terminais pela tela de Configurações do sistema.");
}

function obrigatorio(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} é obrigatória para o bootstrap de produção.`);
  return valor;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
