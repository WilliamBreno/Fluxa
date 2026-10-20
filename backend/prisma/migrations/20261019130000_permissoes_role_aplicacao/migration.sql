-- Permissões da role de runtime (fluxa_app) para tabelas criadas DEPOIS do
-- hardening (scripts/run-hardening.ts).
--
-- O hardening concede acesso só às tabelas que existiam quando ele rodou.
-- As migrações de conciliação (extratos_cartao, transacoes_extrato_cartao,
-- conciliacoes_cartao, taxas_contratadas_cartao) e de assinatura (planos,
-- assinaturas, pagamentos, notificacoes) criaram tabelas novas sem GRANT —
-- num banco endurecido antes delas, a aplicação recebe "permission denied".
--
-- 1) Regulariza todas as tabelas/sequências existentes.
-- 2) Re-aplica a trava da auditoria (o GRANT amplo acima a desfaria).
-- 3) Define privilégios padrão: toda tabela criada daqui em diante pelo dono
--    das migrações já nasce acessível à fluxa_app, sem depender de lembrar
--    de um GRANT em cada migração nova.
--
-- Tudo condicional à existência da role, para não quebrar ambientes onde o
-- hardening nunca foi aplicado (ex.: dev rodando direto como postgres).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fluxa_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fluxa_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fluxa_app;

    REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log" FROM fluxa_app;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fluxa_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO fluxa_app;
  END IF;
END
$$;
