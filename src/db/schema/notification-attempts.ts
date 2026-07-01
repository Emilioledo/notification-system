import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { notifications } from "./notifications.js";

export const notificationAttemptStatusEnum = pgEnum(
  "notification_attempt_status",
  ["PENDING", "SENT", "FAILED"],
);

export const notificationAttempts = pgTable(
  "notification_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    status: notificationAttemptStatusEnum("status").notNull(),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_attempts_notification_id_idx").on(table.notificationId),
  ],
);
