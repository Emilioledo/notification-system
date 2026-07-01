import { describe, expect, it } from "vitest";

import { createNotificationSchema } from "../../../../src/modules/notifications/notification.schemas.js";

describe("createNotificationSchema", () => {
  it("accepts requests with a direct body", () => {
    const parsed = createNotificationSchema.parse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      recipient: "user@example.com",
      body: "Hello from the notification system",
      idempotencyKey: "notification-001",
    });

    expect(parsed.body).toBe("Hello from the notification system");
  });

  it("accepts requests with a template reference", () => {
    const parsed = createNotificationSchema.parse({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "sms",
      recipient: "+5491100000000",
      templateId: "550e8400-e29b-41d4-a716-446655440001",
      templateData: {
        firstName: "Emilio",
      },
      idempotencyKey: "notification-002",
    });

    expect(parsed.templateId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });

  it("rejects requests without body or templateId", () => {
    expect(() =>
      createNotificationSchema.parse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        idempotencyKey: "notification-003",
      }),
    ).toThrow("At least one of body or templateId must be provided");
  });
});
