import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationService } from "../../../../src/modules/notifications/notification.service.js";
import type { NotificationRecord } from "../../../../src/modules/notifications/notification.types.js";

const baseNotification: NotificationRecord = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  channel: "email",
  status: "PENDING",
  recipient: "user@example.com",
  subject: null,
  body: "Hello",
  templateId: null,
  templateData: null,
  idempotencyKey: "notification-001",
  externalRef: null,
  scheduledAt: null,
  lastError: null,
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
  updatedAt: new Date("2026-07-01T12:00:00.000Z"),
};

describe("NotificationService", () => {
  const findByIdempotencyKey = vi.fn();
  const create = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pending notification when the idempotency key is new", async () => {
    findByIdempotencyKey.mockResolvedValueOnce(null);
    create.mockResolvedValueOnce(baseNotification);

    const service = new NotificationService({
      findByIdempotencyKey,
      create,
    });

    const result = await service.createNotification({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      recipient: "user@example.com",
      body: "Hello",
      idempotencyKey: "notification-001",
    });

    expect(result).toEqual({
      created: true,
      notification: baseNotification,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
        idempotencyKey: "notification-001",
      }),
    );
  });

  it("returns the existing notification for an idempotent replay", async () => {
    findByIdempotencyKey.mockResolvedValueOnce(baseNotification);

    const service = new NotificationService({
      findByIdempotencyKey,
      create,
    });

    const result = await service.createNotification({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      recipient: "user@example.com",
      body: "Hello",
      idempotencyKey: "notification-001",
    });

    expect(result).toEqual({
      created: false,
      notification: baseNotification,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("recovers from a unique constraint race by loading the existing row", async () => {
    findByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseNotification);
    create.mockRejectedValueOnce({ code: "23505" });

    const service = new NotificationService({
      findByIdempotencyKey,
      create,
    });

    const result = await service.createNotification({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      recipient: "user@example.com",
      body: "Hello",
      idempotencyKey: "notification-001",
    });

    expect(result).toEqual({
      created: false,
      notification: baseNotification,
    });
  });
});
