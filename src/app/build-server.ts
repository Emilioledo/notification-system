import Fastify from "fastify";

import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

export function buildServer() {
  const server = Fastify({
    loggerInstance: logger,
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "notification-system-api",
    environment: env.NODE_ENV,
  }));

  return server;
}
