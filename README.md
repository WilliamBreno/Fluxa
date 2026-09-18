# Fluxa — Sistema de Abertura/Fechamento de Caixa

Sistema real (não protótipo) de abertura e fechamento de caixa para negócios multi-segmento, com múltiplos caixas e operadores simultâneos na mesma loja. Segue o padrão brasileiro de Leitura X / Redução Z.

## Estrutura

- `backend/` — API Node.js + TypeScript + Express + Prisma/PostgreSQL + Socket.io
- `frontend/` — React + TypeScript + Vite

## Subindo o ambiente (primeira vez)

```bash
# 1) Banco de dados
docker compose up -d
cd backend
cp .env.example .env   # ajuste os segredos JWT antes de ir para produção
```

O Postgres do projeto sobe mapeado na porta **5434** do host (não 5432), para não colidir com um PostgreSQL nativo que já possa estar instalado na máquina. Se 5434 também estiver ocupada no seu ambiente, mude a porta em `docker-compose.yml` e nas duas `*_DATABASE_URL` do `backend/.env`.

```bash

# 2) Dependências e schema
npm install
npm run db:migrate:dev   # cria as tabelas
npm run db:hardening     # aplica índice único parcial + trava a auditoria (rodar 1x)
npm run db:seed          # cria loja/terminais/usuários de exemplo

# 3) Subir a API
npm run dev               # http://localhost:3333
```

```bash
# Em outro terminal: o frontend
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Usuários de exemplo criados pelo seed (senha `fluxa123` para todos):
`admin@fluxa.local`, `gerente@fluxa.local`, `supervisor@fluxa.local`, `operador1@fluxa.local`, `operador2@fluxa.local`.

## Rodando na loja (produção)

- Backend como serviço Windows (PM2 + `pm2-windows-startup`, ou NSSM), banco Postgres nativo ou via Docker.
- Frontend buildado (`npm run build`) e servido como arquivos estáticos.
- **Backup**: configure `pg_dump` diário para uma pasta fora do OneDrive (o sync do OneDrive não substitui backup de banco).
- Troque `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`POSTGRES_SUPERUSER_PASSWORD`/`FLUXA_APP_PASSWORD` dos valores de exemplo antes de ir para produção.
- O banco usa dois usuários: `postgres` (superusuário, dono das tabelas, só usado por migrações/hardening) e `fluxa_app` (role restrita, sem UPDATE/DELETE em `audit_log`, usada pela aplicação em runtime). Isso é o que torna a auditoria realmente imutável — revogar de quem é dono da tabela não teria efeito nenhum no Postgres.

## Escopo desta v1

Veja a seção "Escopo desta v1" no plano de implementação para o que é 100% funcional, o que é estrutura pronta sem provedor real conectado (NFC-e, maquininha, notificação por e-mail/WhatsApp) e o que fica como extensão futura (offline, dashboard consolidado multi-loja).
