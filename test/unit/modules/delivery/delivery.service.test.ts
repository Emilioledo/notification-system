import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeliveryService } from "../../../../src/modules/delivery/delivery.service.js";
import type { NotificationRecord } from "../../../../src/modules/notifications/notification.types.js";

const baseNotification: NotificationRecord = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  channel: "email",
  status: "PENDING",
  recipient: "user@example.com",
  subject: "Welcome",
  body: "Hello from the notification system",
  templateId: null,
  templateData: null,
  idempotencyKey: "notification-001",
  externalRef: null,
  scheduledAt: null,
  lastError: null,
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
};

describe("DeliveryService", () => {
  const findById = vi.fn();
  const updateStatus = vi.fn();
  const sendEmail = vi.fn();
  const sendSms = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads, processes, and marks a notification as sent", async () => {
    findById.mockResolvedValueOnce(baseNotification);
    updateStatus.mockResolvedValue(baseNotification);
    sendEmail.mockResolvedValueOnce({
      externalRef: "email:550e8400-e29b-41d4-a716-446655440010",
    });

    const service = new DeliveryService(
      {
        findById,
        findByIdempotencyKey: vi.fn(),
        create: vi.fn(),
        updateStatus,
      },
      {
        email: { send: sendEmail },
        sms: { send: sendSms },
      },
    );

    await service.processNotification(baseNotification.id);

    expect(updateStatus).toHaveBeenNthCalledWith(
      1,
      baseNotification.id,
      "PROCESSING",
      { lastError: null },
    );
    expect(sendEmail).toHaveBeenCalledWith({
      notificationId: baseNotification.id,
      recipient: "user@example.com",
      subject: "Welcome",
      body: "Hello from the notification system",
    });
    expect(updateStatus).toHaveBeenNthCalledWith(
      2,
      baseNotification.id,
      "SENT",
      {
        externalRef: "email:550e8400-e29b-41d4-a716-446655440010",
        lastError: null,
      },
    );
  });

  it("marks the notification as failed when delivery raises an error", async () => {
    findById.mockResolvedValueOnce(baseNotification);
    updateStatus.mockResolvedValue(baseNotification);
    sendEmail.mockRejectedValueOnce(new Error("provider unavailable"));

    const service = new DeliveryService(
      {
        findById,
        findByIdempotencyKey: vi.fn(),
        create: vi.fn(),
        updateStatus,
      },
      {
        email: { send: sendEmail },
        sms: { send: sendSms },
      },
    );

    await expect(service.processNotification(baseNotification.id)).rejects.toThrow(
      "provider unavailable",
    );

    expect(updateStatus).toHaveBeenNthCalledWith(
      2,
      baseNotification.id,
      "FAILED",
      {
        lastError: "provider unavailable",
      },
    );
  });

  it("fails when the notification body cannot be resolved", async () => {
    findById.mockResolvedValueOnce({
      ...baseNotification,
      body: null,
      templateId: "550e8400-e29b-41d4-a716-446655440001",
    });
    updateStatus.mockResolvedValue(baseNotification);

    const service = new DeliveryService(
      {
        findById,
        findByIdempotencyKey: vi.fn(),
        create: vi.fn(),
        updateStatus,
      },
      {
        email: { send: sendEmail },
        sms: { send: sendSms },
      },
    );

    await expect(service.processNotification(baseNotification.id)).rejects.toThrow(
      "Template resolution is not implemented yet",
    );
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateStatus).toHaveBeenNthCalledWith(
      2,
      baseNotification.id,
      "FAILED",
      {
        lastError: "Template resolution is not implemented yet",
      },
    );
  });
});
