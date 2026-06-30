import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

async function start() {
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
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start();
