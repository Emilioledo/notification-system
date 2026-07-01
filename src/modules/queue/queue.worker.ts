import { Worker } from "bullmq";

import { env } from "../../config/env.js";
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
      await processor(job.data);
    },
    {
      connection: getWorkerRedisOptions(),
      concurrency: env.WORKER_CONCURRENCY,
    },
  );
}
