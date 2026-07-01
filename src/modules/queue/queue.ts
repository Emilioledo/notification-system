import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../../config/env.js";
import { getRetryAttempts, getRetryBackoffMs } from "../delivery/retry.policy.js";
import type { NotificationJobPayload } from "./queue.jobs.js";

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

export type NotificationQueuePort = {
  enqueueNotification(payload: NotificationJobPayload): Promise<void>;
};

export class BullMqNotificationQueue implements NotificationQueuePort {
  constructor(private readonly queue: Queue<NotificationJobPayload>) {}

  async enqueueNotification(payload: NotificationJobPayload) {
    await this.queue.add("notification.deliver", payload, {
      attempts: getRetryAttempts(),
      backoff: {
        type: "exponential",
        delay: getRetryBackoffMs(),
      },
    });
  }
}

export function createNotificationQueuePublisher() {
  const { queue } = createQueue();

  return new BullMqNotificationQueue(queue);
}

export function createNotificationQueuePublisherFromQueue(
  queue: Queue<NotificationJobPayload>,
) {
  return new BullMqNotificationQueue(queue);
}
