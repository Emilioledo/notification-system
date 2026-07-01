import { pathToFileURL } from "node:url";

import { env } from "../config/env.js";
import { createDbClient } from "../db/client.js";
import { DeliveryRepository } from "../modules/delivery/delivery.repository.js";
import { DeliveryService } from "../modules/delivery/delivery.service.js";
import { NotificationRepository } from "../modules/notifications/notification.repository.js";
import { PreferenceRepository } from "../modules/preferences/preference.repository.js";
import { EmailProvider } from "../modules/providers/email.provider.js";
import { SmsProvider } from "../modules/providers/sms.provider.js";
import { createQueue } from "../modules/queue/queue.js";
import { createQueueWorker } from "../modules/queue/queue.worker.js";
import { TemplateRepository } from "../modules/templates/template.repository.js";
import { TemplateService } from "../modules/templates/template.service.js";
import { logger } from "../shared/logger.js";

export async function startWorker() {
  const { client, db } = createDbClient();
  const { queue, connection } = createQueue();
  const notificationRepository = new NotificationRepository(db);
  const deliveryRepository = new DeliveryRepository(db);
  const preferenceRepository = new PreferenceRepository(db);
  const templateRepository = new TemplateRepository(db);
  const templateService = new TemplateService(templateRepository);
  const deliveryServiceWithAttempts = new DeliveryService(
    notificationRepository,
    deliveryRepository,
    preferenceRepository,
    templateService,
    {
      email: new EmailProvider(),
      sms: new SmsProvider(),
    },
  );

  const worker = createQueueWorker(async (payload) => {
    logger.info(
      { notificationId: payload.notificationId, attempt: payload.attempt },
      "Processing notification job",
    );
    await deliveryServiceWithAttempts.processNotification(
      payload.notificationId,
    );
  });

  await client.connect();
  await connection.ping();

  logger.info(
    {
      queueName: env.QUEUE_NAME,
      concurrency: env.WORKER_CONCURRENCY,
      maxRetryAttempts: env.MAX_RETRY_ATTEMPTS,
    },
    "Worker bootstrap completed",
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Worker shutdown requested");

    await Promise.allSettled([
      worker.close(),
      queue.close(),
      connection.quit(),
      client.end(),
    ]);
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void startWorker();
}
