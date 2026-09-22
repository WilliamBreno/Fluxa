-- CreateEnum
CREATE TYPE "CicloAssinatura" AS ENUM ('MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'FALHOU', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('TURNO_ABERTO_HORAS_DEMAIS', 'DIVERGENCIA_ACIMA_TOLERANCIA', 'SANGRIA_ALTA_SEM_CONFERENCIA', 'CONCILIACAO_PENDENTE_REVISAO', 'DIVERGENCIA_RECORRENTE', 'ASSINATURA_TRIAL_EXPIRANDO', 'ASSINATURA_PAGAMENTO_PENDENTE', 'ASSINATURA_PAGAMENTO_CONFIRMADO', 'ASSINATURA_PAGAMENTO_FALHOU');

-- CreateEnum
CREATE TYPE "SeveridadeNotificacao" AS ENUM ('INFO', 'ATENCAO', 'URGENTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AcaoAuditoria" ADD VALUE 'CONTA_CRIADA';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'ASSINATURA_ATUALIZADA';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'ASSINATURA_PAGAMENTO_CONFIRMADO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'ASSINATURA_PAGAMENTO_FALHOU';

-- AlterTable
ALTER TABLE "lojas" ADD COLUMN     "segmento" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "telefone" TEXT;

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "funcionalidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "valorMensal" DECIMAL(10,2) NOT NULL,
    "valorAnual" DECIMAL(10,2) NOT NULL,
    "limiteTerminais" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "planoId" TEXT,
    "ciclo" "CicloAssinatura",
    "status" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
    "trialFim" TIMESTAMP(3) NOT NULL,
    "periodoAtualFim" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "ciclo" "CicloAssinatura" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "checkoutId" TEXT,
    "checkoutUrl" TEXT,
    "pagoEm" TIMESTAMP(3),
    "payloadWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" "TipoNotificacao" NOT NULL,
    "severidade" "SeveridadeNotificacao" NOT NULL DEFAULT 'INFO',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "entidade" TEXT,
    "entidadeId" TEXT,
    "lidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_lojaId_key" ON "assinaturas"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_checkoutId_key" ON "pagamentos"("checkoutId");

-- CreateIndex
CREATE INDEX "pagamentos_assinaturaId_idx" ON "pagamentos"("assinaturaId");

-- CreateIndex
CREATE INDEX "notificacoes_lojaId_lidaEm_idx" ON "notificacoes"("lojaId", "lidaEm");

-- CreateIndex
CREATE INDEX "notificacoes_lojaId_createdAt_idx" ON "notificacoes"("lojaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_lojaId_tipo_entidadeId_key" ON "notificacoes"("lojaId", "tipo", "entidadeId");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "assinaturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

