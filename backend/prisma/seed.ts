import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SENHA_PADRAO_DEV = "fluxa123";

async function main() {
  console.log("Semeando banco de dados de desenvolvimento...");

  const senhaHash = await bcrypt.hash(SENHA_PADRAO_DEV, 10);

  const loja = await prisma.loja.upsert({
    where: { cnpj: "00000000000191" },
    create: {
      nome: "Loja Modelo Fluxa",
      cnpj: "00000000000191",
      endereco: "Rua Exemplo, 123",
      timezone: "America/Sao_Paulo",
      configuracao: {
        create: {
          tetoGavetaDinheiro: 500,
          toleranciaDivergencia: 5,
          valorMinimoConferenciaCruzada: 200,
          horaFechamentoAutomatico: "23:59",
        },
      },
    },
    update: {},
  });

  const caixa1 = await prisma.terminal.upsert({
    where: { lojaId_codigo: { lojaId: loja.id, codigo: "01" } },
    create: { lojaId: loja.id, codigo: "01", nome: "Caixa 1" },
    update: {},
  });
  const caixa2 = await prisma.terminal.upsert({
    where: { lojaId_codigo: { lojaId: loja.id, codigo: "02" } },
    create: { lojaId: loja.id, codigo: "02", nome: "Caixa 2" },
    update: {},
  });

  const usuarios = [
    { nome: "Administrador Fluxa", email: "admin@fluxa.local", roleGlobal: "ADMIN" as const, superAdmin: true },
    { nome: "Gerente da Loja", email: "gerente@fluxa.local", roleGlobal: "GERENTE" as const, superAdmin: false },
    { nome: "Supervisor de Turno", email: "supervisor@fluxa.local", roleGlobal: "SUPERVISOR" as const, superAdmin: false },
    { nome: "Operador Um", email: "operador1@fluxa.local", roleGlobal: "OPERADOR" as const, superAdmin: false },
    { nome: "Operador Dois", email: "operador2@fluxa.local", roleGlobal: "OPERADOR" as const, superAdmin: false },
  ];

  const usuariosCriados: Record<string, string> = {};
  for (const u of usuarios) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      create: { nome: u.nome, email: u.email, senhaHash, roleGlobal: u.roleGlobal, superAdmin: u.superAdmin },
      update: {},
    });
    usuariosCriados[u.email] = usuario.id;

    await prisma.usuarioLoja.upsert({
      where: { usuarioId_lojaId: { usuarioId: usuario.id, lojaId: loja.id } },
      create: { usuarioId: usuario.id, lojaId: loja.id, role: u.roleGlobal },
      update: {},
    });
  }

  // Turnos fechados fictícios para a sugestão de fundo de troco já ter histórico.
  const fundosHistoricos = [150, 200, 180];
  for (let i = 0; i < fundosHistoricos.length; i++) {
    const dataBase = new Date(Date.now() - (i + 1) * 5 * 24 * 60 * 60 * 1000);
    const numeroSequencial = i + 1000; // faixa alta para não colidir com contador real

    const turnoExistente = await prisma.turnoCaixa.findUnique({
      where: { terminalId_numeroSequencial: { terminalId: caixa1.id, numeroSequencial } },
    });
    if (turnoExistente) continue;

    await prisma.turnoCaixa.create({
      data: {
        lojaId: loja.id,
        terminalId: caixa1.id,
        numeroSequencial,
        periodo: "INTEGRAL",
        status: "FECHADO",
        operadorAberturaId: usuariosCriados["operador1@fluxa.local"],
        operadorResponsavelAtualId: usuariosCriados["operador1@fluxa.local"],
        operadorFechamentoId: usuariosCriados["operador1@fluxa.local"],
        dataAbertura: dataBase,
        dataFechamento: new Date(dataBase.getTime() + 8 * 60 * 60 * 1000),
        fundoTrocoInformado: fundosHistoricos[i],
      },
    });
  }

  console.log("Seed concluído.");
  console.log(`Terminais: ${caixa1.nome}, ${caixa2.nome}`);
  console.log("Usuários de desenvolvimento (senha padrão para todos): " + SENHA_PADRAO_DEV);
  for (const u of usuarios) {
    console.log(` - ${u.email} (${u.roleGlobal})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
