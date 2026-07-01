import Fastify from "fastify";

import { env } from "../config/env.js";
import {
  type NotificationService,
  registerNotificationRoutes,
} from "../modules/notifications/notification.controller.js";
import { logger } from "../shared/logger.js";

type BuildServerOptions = {
  notificationService?: NotificationService;
};

export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({
    loggerInstance: logger,
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "notification-system-api",
    environment: env.NODE_ENV,
  }));

  if (options.notificationService) {
    registerNotificationRoutes(server, {
      notificationService: options.notificationService,
    });
  }

  return server;
}
