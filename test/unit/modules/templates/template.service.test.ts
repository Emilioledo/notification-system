import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryError } from "../../../../src/modules/delivery/delivery.errors.js";
import { TemplateService } from "../../../../src/modules/templates/template.service.js";
import type { NotificationRecord } from "../../../../src/modules/notifications/notification.types.js";

const baseNotification: NotificationRecord = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  channel: "email",
  status: "PENDING",
  recipient: "user@example.com",
  subject: "Welcome",
  body: null,
  templateId: "550e8400-e29b-41d4-a716-446655440001",
  templateData: { firstName: "Emilio" },
  idempotencyKey: "notification-001",
  externalRef: null,
  scheduledAt: null,
  lastError: null,
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
};

describe("TemplateService", () => {
  const findLatestByIdAndChannel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns direct body content without loading a template", async () => {
    const service = new TemplateService({
      findLatestByIdAndChannel,
    });

    await expect(
      service.resolve({
        ...baseNotification,
        body: "Direct message",
        templateId: null,
      }),
    ).resolves.toEqual({
      subject: "Welcome",
      body: "Direct message",
    });
    expect(findLatestByIdAndChannel).not.toHaveBeenCalled();
  });

  it("renders subject and body from template data", async () => {
    findLatestByIdAndChannel.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "welcome-email",
      channel: "email",
      subjectTemplate: "Welcome {{firstName}}",
      bodyTemplate: "Hello {{firstName}}, thanks for joining",
      version: 2,
      createdAt: new Date("2026-07-01T11:00:00.000Z"),
    });

    const service = new TemplateService({
      findLatestByIdAndChannel,
    });

    await expect(service.resolve(baseNotification)).resolves.toEqual({
      subject: "Welcome Emilio",
      body: "Hello Emilio, thanks for joining",
    });
  });

  it("fails when the template does not exist", async () => {
    findLatestByIdAndChannel.mockResolvedValueOnce(null);

    const service = new TemplateService({
      findLatestByIdAndChannel,
    });

    await expect(service.resolve(baseNotification)).rejects.toThrow(
      "Template not found for notification",
    );
  });

  it("fails when required template data is missing", async () => {
    const template = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "welcome-email",
      channel: "email",
      subjectTemplate: "Welcome {{firstName}}",
      bodyTemplate: "Hello {{lastName}}",
      version: 1,
      createdAt: new Date("2026-07-01T11:00:00.000Z"),
    };
    findLatestByIdAndChannel.mockResolvedValue(template);

    const service = new TemplateService({
      findLatestByIdAndChannel,
    });

    await expect(service.resolve(baseNotification)).rejects.toThrow(DeliveryError);
    await expect(service.resolve(baseNotification)).rejects.toThrow(
      "Missing template variable: lastName",
    );
  });
});
