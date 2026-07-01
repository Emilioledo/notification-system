import { pathToFileURL } from "node:url";

import { buildServer } from "./build-server.js";
import { env } from "../config/env.js";
import { createDbClient } from "../db/client.js";
import { createNotificationService } from "../modules/notifications/notification.service.js";
import { createQueue } from "../modules/queue/queue.js";

export async function startServer() {
  const { client, db } = createDbClient();
  const notificationService = createNotificationService(db);
  const server = buildServer({ notificationService });
  const { queue, connection } = createQueue();

  try {
    await client.connect();
    await connection.ping();

    await server.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });
  } catch (error) {
    server.log.error({ error }, "Failed to start API server");
    process.exitCode = 1;
  } finally {
    if (process.exitCode !== undefined && process.exitCode !== 0) {
      await Promise.allSettled([
        queue.close(),
        connection.quit(),
        client.end(),
      ]);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void startServer();
}
