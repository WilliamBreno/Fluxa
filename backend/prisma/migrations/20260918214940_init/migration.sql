-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('OPERADOR', 'SUPERVISOR', 'GERENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "PeriodoTurno" AS ENUM ('MANHA', 'TARDE', 'NOITE', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "StatusTurno" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('VENDA', 'SANGRIA', 'SUPRIMENTO', 'CANCELAMENTO', 'DEVOLUCAO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'DEBITO', 'CREDITO', 'PIX', 'VALE', 'FIADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusMovimentacao" AS ENUM ('ATIVA', 'PENDENTE_CONFERENCIA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "StatusFechamento" AS ENUM ('CONTAGEM_PENDENTE', 'CONTAGEM_REALIZADA', 'CALCULADO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "ClassificacaoFechamento" AS ENUM ('EXATO', 'SOBRA', 'FALTA');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('LOGIN', 'LOGIN_FALHO', 'LOGOUT', 'ABERTURA_CAIXA', 'TENTATIVA_ABERTURA_DUPLICADA', 'FECHAMENTO_CAIXA', 'TROCA_OPERADOR', 'MOVIMENTACAO_CRIADA', 'SANGRIA', 'SUPRIMENTO', 'CANCELAMENTO', 'DEVOLUCAO', 'AJUSTE', 'CONFERENCIA_CRUZADA', 'ALTERACAO_CONFIG', 'LEITURA_X', 'ALERTA_TETO_GAVETA', 'FECHAMENTO_AUTOMATICO_ALERTA', 'FECHAMENTO_AUTOMATICO_FORCADO', 'EXPORTACAO_RELATORIO', 'USUARIO_CRIADO', 'USUARIO_ATUALIZADO');

-- CreateEnum
CREATE TYPE "TipoIntegracao" AS ENUM ('FISCAL', 'MAQUININHA', 'NOTIFICACAO');

-- CreateEnum
CREATE TYPE "StatusIntegracao" AS ENUM ('NAO_APLICAVEL', 'SIMULADO', 'PENDENTE', 'SUCESSO', 'ERRO');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('DESABILITADO', 'PENDENTE', 'ENVIADO', 'ERRO');

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "endereco" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminais" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "roleGlobal" "RoleUsuario" NOT NULL,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_lojas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "criadoEmIp" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_caixa" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "numeroSequencial" INTEGER NOT NULL,
    "periodo" "PeriodoTurno" NOT NULL,
    "status" "StatusTurno" NOT NULL DEFAULT 'ABERTO',
    "operadorAberturaId" TEXT NOT NULL,
    "operadorResponsavelAtualId" TEXT NOT NULL,
    "operadorFechamentoId" TEXT,
    "supervisorFechamentoId" TEXT,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "fundoTrocoInformado" DECIMAL(12,2) NOT NULL,
    "fundoTrocoSugerido" DECIMAL(12,2),
    "observacoesAbertura" TEXT,
    "observacoesFechamento" TEXT,
    "fechamentoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turnos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trocas_operador" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "operadorAnteriorId" TEXT NOT NULL,
    "operadorNovoId" TEXT NOT NULL,
    "motivo" TEXT,
    "autorizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trocas_operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_caixa" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "formaPagamento" "FormaPagamento",
    "valor" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "descricao" TEXT,
    "operadorId" TEXT NOT NULL,
    "autorizadoPorId" TEXT,
    "conferidoPorId" TEXT,
    "conferidoEm" TIMESTAMP(3),
    "vendaReferenciaId" TEXT,
    "status" "StatusMovimentacao" NOT NULL DEFAULT 'ATIVA',
    "motivoEstorno" TEXT,
    "estornadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamentos_caixa" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "status" "StatusFechamento" NOT NULL DEFAULT 'CONTAGEM_PENDENTE',
    "causaDivergencia" TEXT,
    "divergenciaTotal" DECIMAL(12,2),
    "classificacaoGeral" "ClassificacaoFechamento",
    "ajusteAutomaticoGerado" BOOLEAN NOT NULL DEFAULT false,
    "confirmadoPorId" TEXT,
    "confirmadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fechamentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamento_contagens_forma" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "valorContado" DECIMAL(12,2) NOT NULL,
    "valorEsperado" DECIMAL(12,2),
    "divergencia" DECIMAL(12,2),
    "classificacao" "ClassificacaoFechamento",
    "contadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculadoEm" TIMESTAMP(3),

    CONSTRAINT "fechamento_contagens_forma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios_fechamento" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "numeroSequencial" INTEGER NOT NULL,
    "conteudoJson" JSONB NOT NULL,
    "hashIntegridade" TEXT NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatorios_fechamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_loja" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "tetoGavetaDinheiro" DECIMAL(12,2) NOT NULL DEFAULT 500,
    "toleranciaDivergencia" DECIMAL(12,2) NOT NULL DEFAULT 5,
    "valorMinimoConferenciaCruzada" DECIMAL(12,2) NOT NULL DEFAULT 200,
    "horaFechamentoAutomatico" TEXT NOT NULL DEFAULT '23:59',
    "fecharAutomaticamenteSemContagem" BOOLEAN NOT NULL DEFAULT false,
    "diasHistoricoMediaTroco" INTEGER NOT NULL DEFAULT 30,
    "emailsGestorResumoDiario" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_loja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT,
    "usuarioId" TEXT,
    "acao" "AcaoAuditoria" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhesJson" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contadores" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valorAtual" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracao_log" (
    "id" TEXT NOT NULL,
    "tipo" "TipoIntegracao" NOT NULL,
    "movimentacaoId" TEXT,
    "status" "StatusIntegracao" NOT NULL DEFAULT 'NAO_APLICAVEL',
    "payloadEnvio" JSONB,
    "payloadResposta" JSONB,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integracao_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_resumo_diario" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "destinatarios" TEXT[],
    "canal" "CanalNotificacao" NOT NULL,
    "status" "StatusNotificacao" NOT NULL DEFAULT 'DESABILITADO',
    "conteudoJson" JSONB,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimaTentativaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_resumo_diario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lojas_cnpj_key" ON "lojas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "terminais_lojaId_codigo_key" ON "terminais"("lojaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_lojas_usuarioId_lojaId_key" ON "usuarios_lojas"("usuarioId", "lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "turnos_caixa_lojaId_status_idx" ON "turnos_caixa"("lojaId", "status");

-- CreateIndex
CREATE INDEX "turnos_caixa_terminalId_status_idx" ON "turnos_caixa"("terminalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_caixa_terminalId_numeroSequencial_key" ON "turnos_caixa"("terminalId", "numeroSequencial");

-- CreateIndex
CREATE INDEX "trocas_operador_turnoId_idx" ON "trocas_operador"("turnoId");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_turnoId_tipo_idx" ON "movimentacoes_caixa"("turnoId", "tipo");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_turnoId_formaPagamento_idx" ON "movimentacoes_caixa"("turnoId", "formaPagamento");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_createdAt_idx" ON "movimentacoes_caixa"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fechamentos_caixa_turnoId_key" ON "fechamentos_caixa"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "fechamento_contagens_forma_fechamentoId_formaPagamento_key" ON "fechamento_contagens_forma"("fechamentoId", "formaPagamento");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_fechamento_turnoId_key" ON "relatorios_fechamento"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_fechamento_lojaId_numeroSequencial_key" ON "relatorios_fechamento"("lojaId", "numeroSequencial");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_loja_lojaId_key" ON "configuracoes_loja"("lojaId");

-- CreateIndex
CREATE INDEX "audit_log_lojaId_createdAt_idx" ON "audit_log"("lojaId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_usuarioId_idx" ON "audit_log"("usuarioId");

-- CreateIndex
CREATE INDEX "audit_log_acao_idx" ON "audit_log"("acao");

-- CreateIndex
CREATE UNIQUE INDEX "contadores_lojaId_chave_key" ON "contadores"("lojaId", "chave");

-- CreateIndex
CREATE INDEX "integracao_log_tipo_status_idx" ON "integracao_log"("tipo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_resumo_diario_lojaId_data_canal_key" ON "notificacoes_resumo_diario"("lojaId", "data", "canal");

-- AddForeignKey
ALTER TABLE "terminais" ADD CONSTRAINT "terminais_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_lojas" ADD CONSTRAINT "usuarios_lojas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_lojas" ADD CONSTRAINT "usuarios_lojas_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "terminais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_operadorAberturaId_fkey" FOREIGN KEY ("operadorAberturaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_operadorResponsavelAtualId_fkey" FOREIGN KEY ("operadorResponsavelAtualId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_operadorFechamentoId_fkey" FOREIGN KEY ("operadorFechamentoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caixa" ADD CONSTRAINT "turnos_caixa_supervisorFechamentoId_fkey" FOREIGN KEY ("supervisorFechamentoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_operador" ADD CONSTRAINT "trocas_operador_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_operador" ADD CONSTRAINT "trocas_operador_operadorAnteriorId_fkey" FOREIGN KEY ("operadorAnteriorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_operador" ADD CONSTRAINT "trocas_operador_operadorNovoId_fkey" FOREIGN KEY ("operadorNovoId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_operador" ADD CONSTRAINT "trocas_operador_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_conferidoPorId_fkey" FOREIGN KEY ("conferidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_vendaReferenciaId_fkey" FOREIGN KEY ("vendaReferenciaId") REFERENCES "movimentacoes_caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_caixa" ADD CONSTRAINT "fechamentos_caixa_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos_caixa" ADD CONSTRAINT "fechamentos_caixa_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_contagens_forma" ADD CONSTRAINT "fechamento_contagens_forma_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "fechamentos_caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_fechamento" ADD CONSTRAINT "relatorios_fechamento_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos_caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios_fechamento" ADD CONSTRAINT "relatorios_fechamento_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_loja" ADD CONSTRAINT "configuracoes_loja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contadores" ADD CONSTRAINT "contadores_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracao_log" ADD CONSTRAINT "integracao_log_movimentacaoId_fkey" FOREIGN KEY ("movimentacaoId") REFERENCES "movimentacoes_caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_resumo_diario" ADD CONSTRAINT "notificacoes_resumo_diario_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
