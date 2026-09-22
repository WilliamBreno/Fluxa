import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { authRoutes } from "./modules/auth/auth.routes";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes";
import { lojasRoutes } from "./modules/lojas/lojas.routes";
import { terminaisRoutes } from "./modules/terminais/terminais.routes";
import { turnosRoutes } from "./modules/turnos/turnos.routes";
import {
  movimentacoesPorTurnoRoutes,
  movimentacoesRoutes,
} from "./modules/movimentacoes/movimentacoes.routes";
import { fechamentoRoutes } from "./modules/fechamento/fechamento.routes";
import { relatoriosRoutes } from "./modules/relatorios/relatorios.routes";
import { auditoriaRoutes } from "./modules/auditoria/auditoria.routes";
import { configuracoesRoutes } from "./modules/configuracoes/configuracoes.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { conciliacaoRoutes } from "./modules/conciliacao/conciliacao.routes";
import { cadastroRoutes } from "./modules/cadastro/cadastro.routes";
import { planosRoutes } from "./modules/planos/planos.routes";
import { assinaturaRoutes } from "./modules/assinatura/assinatura.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
// Limite elevado (padrão é 100kb) para caber o upload de extratos de cartão em
// base64 no corpo JSON (POST /conciliacao/extratos) — os demais endpoints
// continuam com corpos pequenos, então isso não amplia o risco na prática.
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/lojas", lojasRoutes);
app.use("/api/terminais", terminaisRoutes);
app.use("/api/turnos/:turnoId/movimentacoes", movimentacoesPorTurnoRoutes);
app.use("/api/turnos/:id/fechamento", fechamentoRoutes);
app.use("/api/turnos", turnosRoutes);
app.use("/api/movimentacoes", movimentacoesRoutes);
app.use("/api/relatorios", relatoriosRoutes);
app.use("/api/auditoria", auditoriaRoutes);
app.use("/api/configuracoes", configuracoesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/conciliacao", conciliacaoRoutes);
app.use("/api/cadastro", cadastroRoutes);
app.use("/api/planos", planosRoutes);
app.use("/api/assinatura", assinaturaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
