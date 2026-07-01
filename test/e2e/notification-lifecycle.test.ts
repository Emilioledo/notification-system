import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDbClient } from "../../src/db/client.js";
import {
  notificationAttempts,
  notifications,
} from "../../src/db/schema/index.js";
import { buildServer } from "../../src/app/build-server.js";
import { NotificationRepository } from "../../src/modules/notifications/notification.repository.js";
import { createNotificationService } from "../../src/modules/notifications/notification.service.js";
import { PreferenceRepository } from "../../src/modules/preferences/preference.repository.js";
import { DeliveryRepository } from "../../src/modules/delivery/delivery.repository.js";
import { DeliveryService } from "../../src/modules/delivery/delivery.service.js";
import { EmailProvider } from "../../src/modules/providers/email.provider.js";
import { SmsProvider } from "../../src/modules/providers/sms.provider.js";
import { TemplateRepository } from "../../src/modules/templates/template.repository.js";
import { TemplateService } from "../../src/modules/templates/template.service.js";
import {
  createQueue,
  createNotificationQueuePublisherFromQueue,
} from "../../src/modules/queue/queue.js";
import { createQueueWorker } from "../../src/modules/queue/queue.worker.js";
import { desc, eq, sql } from "drizzle-orm";

const shouldRunE2E = process.env.RUN_E2E === "true";
const describeIfE2E = shouldRunE2E ? describe : describe.skip;

describeIfE2E("notification lifecycle e2e", () => {
  const { client, db } = createDbClient();
  const { queue, connection } = createQueue();
  const notificationService = createNotificationService(
    db,
    createNotificationQueuePublisherFromQueue(queue),
  );
  const server = buildServer({ notificationService });
  const notificationRepository = new NotificationRepository(db);
  const deliveryRepository = new DeliveryRepository(db);
  const preferenceRepository = new PreferenceRepository(db);
  const templateRepository = new TemplateRepository(db);
  const templateService = new TemplateService(templateRepository);
  const deliveryService = new DeliveryService(
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
    await deliveryService.processNotification(payload.notificationId);
  });

  beforeAll(async () => {
    await client.connect();
    await connection.ping();
    await server.ready();
  }, 30000);

  afterAll(async () => {
    await Promise.allSettled([
      worker.close(),
      server.close(),
      queue.close(),
      connection.quit(),
      client.end(),
    ]);
  });

  it("creates, enqueues, processes, and stores a successful attempt", async () => {
    const idempotencyKey = `e2e-success-${Date.now()}`;

    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        subject: "Welcome",
        body: "Hello from the end-to-end test",
        idempotencyKey,
      },
    });

    expect(response.statusCode).toBe(201);
    const createdNotification = response.json() as { id: string };

    await waitFor(async () => {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, createdNotification.id))
        .limit(1);

      expect(notification?.status).toBe("SENT");
      expect(notification?.externalRef).toBe(`email:${createdNotification.id}`);
    });

    const [attempt] = await db
      .select()
      .from(notificationAttempts)
      .where(eq(notificationAttempts.notificationId, createdNotification.id))
      .orderBy(desc(notificationAttempts.createdAt))
      .limit(1);

    expect(attempt).toMatchObject({
      notificationId: createdNotification.id,
      provider: "email",
      status: "SENT",
      attemptNumber: 1,
    });
  }, 30000);

  it("fails permanently when template data is missing", async () => {
    const templateId = crypto.randomUUID();
    const idempotencyKey = `e2e-template-failure-${Date.now()}`;
    const templateName = `welcome-template-${Date.now()}`;

    await db.execute(sql`
      insert into templates (id, name, channel, subject_template, body_template, version)
      values (
        ${templateId},
        ${templateName},
        'email',
        'Welcome {{firstName}}',
        'Hello {{lastName}}',
        1
      )
    `);

    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        templateId,
        templateData: {
          firstName: "Emilio",
        },
        idempotencyKey,
      },
    });

    expect(response.statusCode).toBe(201);
    const createdNotification = response.json() as { id: string };

    await waitFor(async () => {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, createdNotification.id))
        .limit(1);

      expect(notification?.status).toBe("FAILED");
      expect(notification?.lastError).toContain(
        "Missing template variable: lastName",
      );
    });

    const [attempt] = await db
      .select()
      .from(notificationAttempts)
      .where(eq(notificationAttempts.notificationId, createdNotification.id))
      .orderBy(desc(notificationAttempts.createdAt))
      .limit(1);

    expect(attempt).toMatchObject({
      notificationId: createdNotification.id,
      provider: "email",
      status: "FAILED",
      errorCode: "MISSING_TEMPLATE_DATA",
    });
  }, 30000);
});

async function waitFor(assertion: () => Promise<void>, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError;
}
