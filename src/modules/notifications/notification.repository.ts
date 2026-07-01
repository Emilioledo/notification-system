import { eq } from "drizzle-orm";

import type { DatabaseClient } from "../../db/client.js";
import { notifications } from "../../db/schema/index.js";

import type {
  CreateNotificationRecord,
  NotificationRecord,
  NotificationStatus,
} from "./notification.types.js";

export type NotificationRepositoryPort = {
  findById(id: string): Promise<NotificationRecord | null>;
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<NotificationRecord | null>;
  create(input: CreateNotificationRecord): Promise<NotificationRecord>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    updates?: {
      externalRef?: string | null;
      lastError?: string | null;
    },
  ): Promise<NotificationRecord>;
};

export class NotificationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(id: string): Promise<NotificationRecord | null> {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);

    return notification ?? null;
  }

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

  async updateStatus(
    id: string,
    status: NotificationStatus,
    updates: {
      externalRef?: string | null;
      lastError?: string | null;
    } = {},
  ): Promise<NotificationRecord> {
    const [notification] = await this.db
      .update(notifications)
      .set({
        status,
        externalRef: updates.externalRef,
        lastError: updates.lastError,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();

    if (!notification) {
      throw new Error(`Notification ${id} was not found during status update`);
    }

    return notification;
  }
}
