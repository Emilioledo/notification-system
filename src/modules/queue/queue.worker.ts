import { Worker } from "bullmq";

import { env } from "../../config/env.js";
import { isPermanentDeliveryError } from "../delivery/delivery.errors.js";
import type { NotificationJobPayload } from "./queue.jobs.js";

function getWorkerRedisOptions() {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    maxRetriesPerRequest: null,
  };
}

export function createQueueWorker(
  processor: (payload: NotificationJobPayload) => Promise<void>,
) {
  return new Worker<NotificationJobPayload>(
    env.QUEUE_NAME,
    async (job) => {
      try {
        await processor({
          ...job.data,
          attempt: job.attemptsStarted,
        });
      } catch (error) {
        if (isPermanentDeliveryError(error)) {
          await job.discard();
        }

        throw error;
      }
    },
    {
      connection: getWorkerRedisOptions(),
      concurrency: env.WORKER_CONCURRENCY,
    },
  );
}
