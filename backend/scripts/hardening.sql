-- Aplicado por scripts/run-hardening.ts (npm run db:hardening), depois da
-- primeira migração. Os passos de criação de role e GRANT/REVOKE ficam no
-- próprio .ts (precisam da senha vinda do .env) — este arquivo só tem o
-- índice, que não depende de nenhum segredo.

-- Bloqueio de caixa duplicado no nível do banco: garante que nunca existam
-- dois turnos ABERTO simultâneos no mesmo terminal, mesmo sob concorrência
-- real de múltiplos caixas. A aplicação já trava isso via SELECT ... FOR
-- UPDATE em transação (turnos.service.ts) — este índice é uma segunda
-- camada de defesa, direto no banco.
CREATE UNIQUE INDEX IF NOT EXISTS turno_caixa_terminal_aberto_uidx
  ON "turnos_caixa" ("terminalId")
  WHERE "status" = 'ABERTO';
