-- CreateEnum
CREATE TYPE "StatusExtrato" AS ENUM ('PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- CreateEnum
CREATE TYPE "Bandeira" AS ENUM ('VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTRA');

-- CreateEnum
CREATE TYPE "ModalidadeCartao" AS ENUM ('DEBITO', 'CREDITO_A_VISTA', 'CREDITO_PARCELADO');

-- CreateEnum
CREATE TYPE "StatusConciliacaoTransacao" AS ENUM ('CONCILIADO', 'DIVERGENTE', 'SEM_VENDA', 'MANUAL', 'IGNORADO');

-- CreateEnum
CREATE TYPE "StatusConciliacaoMovimentacao" AS ENUM ('SEM_EXTRATO', 'CONCILIADO', 'DIVERGENTE', 'PENDENTE_REVISAO', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AcaoAuditoria" ADD VALUE 'IMPORTACAO_EXTRATO_CARTAO';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'CONCILIACAO_EXECUTADA';
ALTER TYPE "AcaoAuditoria" ADD VALUE 'CONCILIACAO_RESOLVIDA_MANUAL';

-- AlterTable
ALTER TABLE "configuracoes_loja" ADD COLUMN     "toleranciaDiasConciliacaoCartao" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "movimentacoes_caixa" ADD COLUMN     "chaveIdempotencia" TEXT,
ADD COLUMN     "nsuMaquininha" TEXT;

-- CreateTable
CREATE TABLE "extratos_cartao" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "adquirente" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "hashArquivo" TEXT NOT NULL,
    "mapeamentoColunas" JSONB,
    "status" "StatusExtrato" NOT NULL DEFAULT 'PROCESSANDO',
    "totalLinhas" INTEGER NOT NULL DEFAULT 0,
    "totalImportadas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "importadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extratos_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes_extrato_cartao" (
    "id" TEXT NOT NULL,
    "extratoId" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "nsu" TEXT,
    "autorizacao" TEXT,
    "bandeira" "Bandeira",
    "modalidade" "ModalidadeCartao",
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "numeroParcela" INTEGER NOT NULL DEFAULT 1,
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "valorLiquido" DECIMAL(12,2) NOT NULL,
    "valorTaxa" DECIMAL(12,2) NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "dataPagamentoPrevista" TIMESTAMP(3) NOT NULL,
    "linhaOriginal" JSONB NOT NULL,
    "usadaEmConciliacao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_extrato_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacoes_cartao" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "movimentacaoId" TEXT,
    "transacaoExtratoId" TEXT,
    "statusMovimentacao" "StatusConciliacaoMovimentacao" NOT NULL DEFAULT 'SEM_EXTRATO',
    "statusTransacao" "StatusConciliacaoTransacao",
    "nivelConfianca" INTEGER,
    "diferencaValor" DECIMAL(12,2),
    "observacao" TEXT,
    "resolvidoPorId" TEXT,
    "resolvidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conciliacoes_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxas_contratadas_cartao" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "bandeira" "Bandeira" NOT NULL,
    "modalidade" "ModalidadeCartao" NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "taxaPercentual" DECIMAL(5,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxas_contratadas_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extratos_cartao_lojaId_hashArquivo_key" ON "extratos_cartao"("lojaId", "hashArquivo");

-- CreateIndex
CREATE INDEX "transacoes_extrato_cartao_lojaId_dataVenda_idx" ON "transacoes_extrato_cartao"("lojaId", "dataVenda");

-- CreateIndex
CREATE INDEX "transacoes_extrato_cartao_nsu_idx" ON "transacoes_extrato_cartao"("nsu");

-- CreateIndex
CREATE INDEX "transacoes_extrato_cartao_lojaId_usadaEmConciliacao_idx" ON "transacoes_extrato_cartao"("lojaId", "usadaEmConciliacao");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_cartao_movimentacaoId_key" ON "conciliacoes_cartao"("movimentacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacoes_cartao_transacaoExtratoId_key" ON "conciliacoes_cartao"("transacaoExtratoId");

-- CreateIndex
CREATE INDEX "conciliacoes_cartao_lojaId_statusMovimentacao_idx" ON "conciliacoes_cartao"("lojaId", "statusMovimentacao");

-- CreateIndex
CREATE UNIQUE INDEX "taxas_contratadas_cartao_lojaId_bandeira_modalidade_parcela_key" ON "taxas_contratadas_cartao"("lojaId", "bandeira", "modalidade", "parcelas", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacoes_caixa_chaveIdempotencia_key" ON "movimentacoes_caixa"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_nsuMaquininha_idx" ON "movimentacoes_caixa"("nsuMaquininha");

-- AddForeignKey
ALTER TABLE "extratos_cartao" ADD CONSTRAINT "extratos_cartao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extratos_cartao" ADD CONSTRAINT "extratos_cartao_importadoPorId_fkey" FOREIGN KEY ("importadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_extrato_cartao" ADD CONSTRAINT "transacoes_extrato_cartao_extratoId_fkey" FOREIGN KEY ("extratoId") REFERENCES "extratos_cartao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_extrato_cartao" ADD CONSTRAINT "transacoes_extrato_cartao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_cartao" ADD CONSTRAINT "conciliacoes_cartao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_cartao" ADD CONSTRAINT "conciliacoes_cartao_movimentacaoId_fkey" FOREIGN KEY ("movimentacaoId") REFERENCES "movimentacoes_caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_cartao" ADD CONSTRAINT "conciliacoes_cartao_transacaoExtratoId_fkey" FOREIGN KEY ("transacaoExtratoId") REFERENCES "transacoes_extrato_cartao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_cartao" ADD CONSTRAINT "conciliacoes_cartao_resolvidoPorId_fkey" FOREIGN KEY ("resolvidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxas_contratadas_cartao" ADD CONSTRAINT "taxas_contratadas_cartao_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

