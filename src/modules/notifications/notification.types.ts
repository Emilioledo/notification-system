import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type { notifications } from "../../db/schema/index.js";

export type NotificationRecord = InferSelectModel<typeof notifications>;

export type CreateNotificationRecord = InferInsertModel<typeof notifications>;

export type CreateNotificationInput = {
  userId: string;
  channel: "email" | "sms";
  recipient: string;
  subject?: string;
  body?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  idempotencyKey: string;
};

export type CreateNotificationResult = {
  created: boolean;
  notification: NotificationRecord;
};
