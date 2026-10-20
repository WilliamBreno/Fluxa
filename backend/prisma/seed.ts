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

  const planos = [
    {
      nome: "Essencial",
      descricao: "Para quem está começando a organizar o caixa.",
      funcionalidades: [
        "1 caixa (terminal)",
        "Abertura e fechamento com contagem cega",
        "Leitura X e Redução Z",
        "Relatórios básicos e auditoria",
      ],
      valorMensal: 79.9,
      valorAnual: 799,
      limiteTerminais: 1,
      ordem: 1,
    },
    {
      nome: "Profissional",
      descricao: "Para negócios com mais de um caixa e cartão na maquininha.",
      funcionalidades: [
        "Até 5 caixas (terminais)",
        "Tudo do Essencial",
        "Conciliação de cartões e recebíveis",
        "Modo offline com sincronização automática",
        "Relatórios avançados e exportação (CSV/Excel/PDF)",
      ],
      valorMensal: 149.9,
      valorAnual: 1499,
      limiteTerminais: 5,
      ordem: 2,
    },
    {
      nome: "Enterprise",
      descricao: "Para redes com várias lojas e operação mais exigente.",
      funcionalidades: [
        "Caixas ilimitados",
        "Tudo do Profissional",
        "Múltiplas lojas",
        "Suporte prioritário",
      ],
      valorMensal: 299.9,
      valorAnual: 2999,
      limiteTerminais: null,
      ordem: 3,
    },
  ];

  for (const p of planos) {
    await prisma.plano.upsert({
      where: { nome: p.nome },
      create: p,
      update: {
        descricao: p.descricao,
        funcionalidades: p.funcionalidades,
        valorMensal: p.valorMensal,
        valorAnual: p.valorAnual,
        limiteTerminais: p.limiteTerminais,
        ordem: p.ordem,
      },
    });
  }

  const planoProfissional = await prisma.plano.findUniqueOrThrow({ where: { nome: "Profissional" } });
  await prisma.assinatura.upsert({
    where: { lojaId: loja.id },
    create: {
      lojaId: loja.id,
      planoId: planoProfissional.id,
      ciclo: "MENSAL",
      status: "ATIVA",
      trialFim: new Date(),
    },
    update: { planoId: planoProfissional.id, ciclo: "MENSAL", status: "ATIVA" },
  });

  // Agenda de exemplo: catálogo de serviços, alguns clientes e o dia de hoje
  // já com horários marcados, para a tela de agenda não abrir vazia em dev.
  const servicosExemplo = [
    { nome: "Atendimento padrão", duracaoMinutos: 30, preco: 60, cor: "#2a78d6" },
    { nome: "Atendimento completo", duracaoMinutos: 60, preco: 120, cor: "#1baf7a" },
    { nome: "Retorno", duracaoMinutos: 20, preco: 0, cor: "#eda100" },
    { nome: "Avaliação", duracaoMinutos: 45, preco: 90, cor: "#e87ba4" },
  ];
  const servicosCriados: { id: string; duracaoMinutos: number; preco: number }[] = [];
  for (const s of servicosExemplo) {
    const servico = await prisma.servico.upsert({
      where: { lojaId_nome: { lojaId: loja.id, nome: s.nome } },
      create: { ...s, lojaId: loja.id },
      update: {},
    });
    servicosCriados.push({ id: servico.id, duracaoMinutos: s.duracaoMinutos, preco: s.preco });
  }

  const clientesExemplo = [
    { nome: "Ana Paula Ribeiro", telefone: "11987654321", email: "ana.ribeiro@exemplo.com", tags: ["vip"], cidade: "São Paulo", uf: "SP" },
    { nome: "Bruno Carvalho", telefone: "11991234567", tags: ["indicação"], cidade: "São Paulo", uf: "SP" },
    { nome: "Carla Mendes", telefone: "11976543210", email: "carla.m@exemplo.com", tags: [], cidade: "Osasco", uf: "SP" },
    { nome: "Diego Fernandes", telefone: "11965432109", tags: ["vip", "pontual"], cidade: "São Paulo", uf: "SP" },
    { nome: "Elaine Costa", telefone: "11954321098", tags: [], cidade: "Guarulhos", uf: "SP" },
  ];
  const jaTemClientes = (await prisma.cliente.count({ where: { lojaId: loja.id } })) > 0;
  if (!jaTemClientes) {
    const criadoPorId = usuariosCriados["gerente@fluxa.local"];
    const profissionais = [usuariosCriados["operador1@fluxa.local"], usuariosCriados["operador2@fluxa.local"]];
    const clientes = [];
    for (const c of clientesExemplo) {
      clientes.push(await prisma.cliente.create({ data: { ...c, lojaId: loja.id, criadoPorId } }));
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em = (diasOffset: number, hora: number, minuto = 0) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + diasOffset);
      d.setHours(hora, minuto, 0, 0);
      return d;
    };
    const agenda = [
      { cliente: 0, servico: 1, prof: 0, inicio: em(0, 9), status: "CONCLUIDO" as const },
      { cliente: 1, servico: 0, prof: 1, inicio: em(0, 9, 30), status: "CONCLUIDO" as const },
      { cliente: 2, servico: 3, prof: 0, inicio: em(0, 11), status: "CONFIRMADO" as const },
      { cliente: 3, servico: 0, prof: 1, inicio: em(0, 14), status: "AGENDADO" as const },
      { cliente: 4, servico: 2, prof: 0, inicio: em(0, 15, 30), status: "AGENDADO" as const },
      { cliente: 0, servico: 0, prof: 1, inicio: em(1, 10), status: "AGENDADO" as const },
      { cliente: 1, servico: 1, prof: 0, inicio: em(-7, 16), status: "FALTOU" as const },
      { cliente: 3, servico: 1, prof: 0, inicio: em(-14, 10), status: "CONCLUIDO" as const },
    ];
    for (const a of agenda) {
      const servico = servicosCriados[a.servico];
      await prisma.agendamento.create({
        data: {
          lojaId: loja.id,
          clienteId: clientes[a.cliente].id,
          servicoId: servico.id,
          profissionalId: profissionais[a.prof],
          inicio: a.inicio,
          fim: new Date(a.inicio.getTime() + servico.duracaoMinutos * 60_000),
          valor: servico.preco,
          status: a.status,
          criadoPorId,
          confirmadoEm: a.status === "CONFIRMADO" ? new Date() : null,
          concluidoEm: a.status === "CONCLUIDO" ? a.inicio : null,
        },
      });
    }
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
