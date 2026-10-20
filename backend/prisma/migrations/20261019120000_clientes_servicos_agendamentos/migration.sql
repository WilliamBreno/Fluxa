-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AcaoAuditoria" ADD VALUE 'CLIENTE_CRIADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'CLIENTE_ATUALIZADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'SERVICO_ALTERADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'AGENDAMENTO_CRIADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'AGENDAMENTO_ATUALIZADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'AGENDAMENTO_STATUS_ALTERADO';

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'AGENDAMENTO_SEM_CONFIRMACAO';

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "dataNascimento" DATE,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "origem" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_notas" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracaoMinutos" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#2a78d6',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "servicoId" TEXT,
    "profissionalId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "valor" DECIMAL(10,2),
    "observacoes" TEXT,
    "motivoCancelamento" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "confirmadoEm" TIMESTAMP(3),
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_lojaId_nome_idx" ON "clientes"("lojaId", "nome");

-- CreateIndex
CREATE INDEX "clientes_lojaId_telefone_idx" ON "clientes"("lojaId", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_lojaId_cpf_key" ON "clientes"("lojaId", "cpf");

-- CreateIndex
CREATE INDEX "clientes_notas_clienteId_createdAt_idx" ON "clientes_notas"("clienteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_lojaId_nome_key" ON "servicos"("lojaId", "nome");

-- CreateIndex
CREATE INDEX "agendamentos_lojaId_inicio_idx" ON "agendamentos"("lojaId", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_profissionalId_inicio_idx" ON "agendamentos"("profissionalId", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_clienteId_inicio_idx" ON "agendamentos"("clienteId", "inicio");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_notas" ADD CONSTRAINT "clientes_notas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_notas" ADD CONSTRAINT "clientes_notas_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Permissões da role de runtime: o GRANT do hardening (scripts/run-hardening.ts)
-- só cobre as tabelas que já existiam quando ele rodou. Sem isto, a aplicação
-- (que conecta como fluxa_app) receberia "permission denied" nas tabelas novas.
-- Condicional para não quebrar ambientes onde o hardening nunca foi aplicado.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fluxa_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "clientes", "clientes_notas", "servicos", "agendamentos" TO fluxa_app;
  END IF;
END
$$;
