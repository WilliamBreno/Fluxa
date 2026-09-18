import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Aplica o hardening de segurança do banco. Roda UMA VEZ, depois da primeira
 * `prisma migrate deploy`/`dev` (que cria as tabelas com o superusuário
 * "postgres" como dono, via DIRECT_DATABASE_URL).
 *
 * Por quê uma role separada: no Postgres, revogar um privilégio do PRÓPRIO
 * DONO da tabela não tem nenhum efeito — o dono sempre ignora a ACL. Se a
 * aplicação rodasse como o mesmo usuário que criou as tabelas (dono), um
 * REVOKE UPDATE/DELETE em audit_log seria só teatro de segurança. Por isso
 * este script cria uma role "fluxa_app" que NÃO é dona de nada, só recebe
 * GRANTs explícitos — e é essa role, não o superusuário, que a aplicação usa
 * em runtime (DATABASE_URL).
 */
async function main() {
  const directUrl = process.env.DIRECT_DATABASE_URL;
  const senhaApp = process.env.FLUXA_APP_PASSWORD;
  if (!directUrl) throw new Error("DIRECT_DATABASE_URL não definido no .env — necessário para o hardening.");
  if (!senhaApp) throw new Error("FLUXA_APP_PASSWORD não definido no .env — necessário para criar a role fluxa_app.");

  // Conecta como o superusuário dono das tabelas (nunca como fluxa_app aqui).
  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

  console.log("Criando/atualizando a role restrita fluxa_app...");
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fluxa_app') THEN
        CREATE ROLE fluxa_app LOGIN PASSWORD '${senhaApp.replace(/'/g, "''")}';
      ELSE
        ALTER ROLE fluxa_app WITH LOGIN PASSWORD '${senhaApp.replace(/'/g, "''")}';
      END IF;
    END
    $$;
  `);

  console.log("Concedendo acesso ao schema e às tabelas...");
  await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE fluxa TO fluxa_app;`);
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO fluxa_app;`);
  await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fluxa_app;`);
  await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fluxa_app;`);

  console.log("Travando a auditoria: revogando UPDATE/DELETE de fluxa_app em audit_log...");
  await prisma.$executeRawUnsafe(`REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log" FROM fluxa_app;`);

  console.log("Aplicando índice único parcial (bloqueio de caixa duplicado no nível do banco)...");
  const sqlIndice = readFileSync(join(__dirname, "hardening.sql"), "utf-8");
  const semComentarios = sqlIndice
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("--"))
    .join("\n");
  for (const statement of semComentarios.split(";").map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Hardening aplicado com sucesso. A aplicação agora deve rodar com DATABASE_URL apontando para fluxa_app.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Falha ao aplicar hardening:", err);
  process.exit(1);
});
