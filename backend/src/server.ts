import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { initSocket } from "./lib/socket";
import { iniciarJobsAgendados } from "./jobs/scheduler";
import { logger } from "./lib/logger";

const httpServer = createServer(app);
initSocket(httpServer);
iniciarJobsAgendados();

if (env.nodeEnv === "production" && env.pagamentoProvider === "stub") {
  logger.warn(
    "PAGAMENTO_PROVIDER=stub em produção: qualquer gerente pode aprovar o próprio pagamento simulado (/assinatura/simular). Configure PAGAMENTO_PROVIDER=infinitepay para cobrar de verdade."
  );
}

httpServer.listen(env.port, () => {
  logger.info(`Fluxa API rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});
