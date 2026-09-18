import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __fluxaPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__fluxaPrisma ??
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (env.nodeEnv !== "production") {
  global.__fluxaPrisma = prisma;
}
