import { describe, expect, it } from "vitest";

import {
  notificationAttemptStatusEnum,
  notificationAttempts,
  notificationChannelEnum,
  notifications,
  notificationStatusEnum,
  templates,
  userPreferences,
} from "../../../src/db/schema/index.js";

describe("database schema", () => {
  it("defines the supported channel enum values", () => {
    expect(notificationChannelEnum.enumValues).toEqual(["email", "sms"]);
  });

  it("defines the notification lifecycle states", () => {
    expect(notificationStatusEnum.enumValues).toEqual([
      "PENDING",
      "PROCESSING",
      "SENT",
      "RETRY_SCHEDULED",
      "FAILED",
      "CANCELLED",
    ]);
  });

  it("defines the notification attempt states", () => {
    expect(notificationAttemptStatusEnum.enumValues).toEqual([
      "PENDING",
      "SENT",
      "FAILED",
    ]);
  });

  it("models notifications with the expected core columns", () => {
    expect(notifications.id.name).toBe("id");
    expect(notifications.userId.name).toBe("user_id");
    expect(notifications.channel.name).toBe("channel");
    expect(notifications.status.name).toBe("status");
    expect(notifications.recipient.name).toBe("recipient");
    expect(notifications.idempotencyKey.name).toBe("idempotency_key");
    expect(notifications.templateData.name).toBe("template_data");
    expect(notifications.createdAt.name).toBe("created_at");
    expect(notifications.updatedAt.name).toBe("updated_at");
  });

  it("models notification attempts linked to notifications", () => {
    expect(notificationAttempts.notificationId.name).toBe("notification_id");
    expect(notificationAttempts.attemptNumber.name).toBe("attempt_number");
    expect(notificationAttempts.provider.name).toBe("provider");
    expect(notificationAttempts.status.name).toBe("status");
  });

  it("models user preferences with one setting per user and channel", () => {
    expect(userPreferences.userId.name).toBe("user_id");
    expect(userPreferences.channel.name).toBe("channel");
    expect(userPreferences.enabled.name).toBe("enabled");
    expect(userPreferences.updatedAt.name).toBe("updated_at");
  });

  it("models templates with versioned content per channel", () => {
    expect(templates.name.name).toBe("name");
    expect(templates.channel.name).toBe("channel");
    expect(templates.subjectTemplate.name).toBe("subject_template");
    expect(templates.bodyTemplate.name).toBe("body_template");
    expect(templates.version.name).toBe("version");
  });
});
