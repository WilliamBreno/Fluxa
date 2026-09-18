import { createServer } from "http";
import { app } from "./app";
import { env } from "./config/env";
import { initSocket } from "./lib/socket";
import { iniciarJobsAgendados } from "./jobs/scheduler";
import { logger } from "./lib/logger";

const httpServer = createServer(app);
initSocket(httpServer);
iniciarJobsAgendados();

httpServer.listen(env.port, () => {
  logger.info(`Fluxa API rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});
