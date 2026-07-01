import { eq } from "drizzle-orm";

import type { DatabaseClient } from "../../db/client.js";
import { notifications } from "../../db/schema/index.js";

import type {
  CreateNotificationRecord,
  NotificationRecord,
} from "./notification.types.js";

export type NotificationRepositoryPort = {
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<NotificationRecord | null>;
  create(input: CreateNotificationRecord): Promise<NotificationRecord>;
};

export class NotificationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<NotificationRecord | null> {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.idempotencyKey, idempotencyKey))
      .limit(1);

    return notification ?? null;
  }

  async create(input: CreateNotificationRecord): Promise<NotificationRecord> {
    const [notification] = await this.db
      .insert(notifications)
      .values(input)
      .returning();

    if (!notification) {
      throw new Error("Notification insert returned no row");
    }

    return notification;
  }
}
