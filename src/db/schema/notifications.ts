import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "PENDING",
  "PROCESSING",
  "SENT",
  "RETRY_SCHEDULED",
  "FAILED",
  "CANCELLED",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationStatusEnum("status").notNull().default("PENDING"),
    recipient: varchar("recipient", { length: 320 }).notNull(),
    subject: text("subject"),
    body: text("body"),
    templateId: uuid("template_id"),
    templateData: jsonb("template_data").$type<Record<string, unknown>>(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    externalRef: varchar("external_ref", { length: 255 }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notifications_idempotency_key_idx").on(table.idempotencyKey),
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_status_idx").on(table.status),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);
