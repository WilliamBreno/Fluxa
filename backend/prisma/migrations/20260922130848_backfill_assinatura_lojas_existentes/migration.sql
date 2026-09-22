-- Data migration: lojas criadas antes do gate de assinatura (demo/seed e
-- contas já provisionadas via bootstrap-prod) não têm linha em "assinaturas".
-- Sem isso, o middleware requireAssinaturaAtiva bloquearia essas lojas assim
-- que este deploy for aplicado. Todas ganham status ATIVA sem
-- periodoAtualFim (= sem vencimento controlado, gerenciada manualmente) —
-- "grandfathering" de quem já usava o sistema antes de existir cobrança.
INSERT INTO "assinaturas" ("id", "lojaId", "status", "trialFim", "periodoAtualFim", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "lojas"."id", 'ATIVA', now(), NULL, now(), now()
FROM "lojas"
WHERE NOT EXISTS (
  SELECT 1 FROM "assinaturas" WHERE "assinaturas"."lojaId" = "lojas"."id"
);
