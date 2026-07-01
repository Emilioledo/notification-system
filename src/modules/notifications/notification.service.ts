import type { DatabaseClient } from "../../db/client.js";
import {
  BullMqNotificationQueue,
  type NotificationQueuePort,
} from "../queue/queue.js";

import {
  NotificationRepository,
  type NotificationRepositoryPort,
} from "./notification.repository.js";
import type {
  CreateNotificationInput,
  CreateNotificationResult,
} from "./notification.types.js";

function isIdempotencyConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepositoryPort,
    private readonly notificationQueue: NotificationQueuePort,
  ) {}

  async createNotification(
    input: CreateNotificationInput,
  ): Promise<CreateNotificationResult> {
    const existingNotification = await this.repository.findByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existingNotification) {
      return {
        created: false,
        notification: existingNotification,
      };
    }

    try {
      const notification = await this.repository.create({
        userId: input.userId,
        channel: input.channel,
        status: "PENDING",
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
        templateId: input.templateId,
        templateData: input.templateData,
        idempotencyKey: input.idempotencyKey,
      });

      await this.notificationQueue.enqueueNotification({
        notificationId: notification.id,
        attempt: 1,
      });

      return {
        created: true,
        notification,
      };
    } catch (error) {
      if (!isIdempotencyConflict(error)) {
        throw error;
      }

      const conflictNotification = await this.repository.findByIdempotencyKey(
        input.idempotencyKey,
      );

      if (!conflictNotification) {
        throw error;
      }

      return {
        created: false,
        notification: conflictNotification,
      };
    }
  }
}

export function createNotificationService(
  db: DatabaseClient,
  notificationQueue: BullMqNotificationQueue,
) {
  return new NotificationService(new NotificationRepository(db), notificationQueue);
}
