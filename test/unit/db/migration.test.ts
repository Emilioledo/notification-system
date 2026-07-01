import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationFile = resolve(
  process.cwd(),
  "src/db/migrations/0000_tearful_mattie_franklin.sql",
);

const migrationSql = readFileSync(migrationFile, "utf8");

describe("initial database migration", () => {
  it("creates the expected enums", () => {
    expect(migrationSql).toContain(
      'CREATE TYPE "public"."notification_channel" AS ENUM(\'email\', \'sms\')',
    );
    expect(migrationSql).toContain(
      'CREATE TYPE "public"."notification_status" AS ENUM(\'PENDING\', \'PROCESSING\', \'SENT\', \'RETRY_SCHEDULED\', \'FAILED\', \'CANCELLED\')',
    );
    expect(migrationSql).toContain(
      'CREATE TYPE "public"."notification_attempt_status" AS ENUM(\'PENDING\', \'SENT\', \'FAILED\')',
    );
  });

  it("creates all core tables", () => {
    expect(migrationSql).toContain('CREATE TABLE "notifications"');
    expect(migrationSql).toContain('CREATE TABLE "notification_attempts"');
    expect(migrationSql).toContain('CREATE TABLE "user_preferences"');
    expect(migrationSql).toContain('CREATE TABLE "templates"');
  });

  it("adds the notification attempts foreign key", () => {
    expect(migrationSql).toContain(
      'ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action',
    );
  });

  it("creates the main unique and lookup indexes", () => {
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "notifications_idempotency_key_idx"',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "user_preferences_user_id_channel_idx"',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "templates_name_channel_version_idx"',
    );
    expect(migrationSql).toContain(
      'CREATE INDEX "notifications_status_idx"',
    );
  });
});
