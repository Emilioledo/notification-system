import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../../config/env.js";

function getRedisOptions() {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    maxRetriesPerRequest: null,
  };
}

export function createQueue() {
  const connection = new Redis(getRedisOptions());
  const queue = new Queue(env.QUEUE_NAME, { connection: getRedisOptions() });

  return {
    queue,
    connection,
  };
}
