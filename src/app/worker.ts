import { env } from "../config/env.js";
import { createDbClient } from "../db/client.js";
import { createQueue } from "../modules/queue/queue.js";
import { logger } from "../shared/logger.js";

async function start() {
  const { client } = createDbClient();
  const { queue, connection } = createQueue();

  await client.connect();
  await connection.ping();

  logger.info(
    {
      queueName: env.QUEUE_NAME,
      concurrency: env.WORKER_CONCURRENCY,
      maxRetryAttempts: env.MAX_RETRY_ATTEMPTS
    },
    "Worker bootstrap completed"
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Worker shutdown requested");

    await Promise.allSettled([queue.close(), connection.quit(), client.end()]);
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start();
