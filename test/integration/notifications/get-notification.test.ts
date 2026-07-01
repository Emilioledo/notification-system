import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildServer } from "../../../src/app/build-server.js";

describe("GET /notifications/:id", () => {
  const createNotification = vi.fn();
  const getNotification = vi.fn();
  const server = buildServer({
    notificationService: {
      createNotification,
      getNotification,
    },
  });

  beforeAll(async () => {
    await server.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns the stored notification", async () => {
    getNotification.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440010",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      status: "SENT",
      recipient: "user@example.com",
      subject: "Welcome",
      body: "Hello",
      templateId: null,
      templateData: null,
      idempotencyKey: "notification-001",
      externalRef: "email:550e8400-e29b-41d4-a716-446655440010",
      scheduledAt: null,
      lastError: null,
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-01T12:00:00.000Z",
    });

    const response = await server.inject({
      method: "GET",
      url: "/notifications/550e8400-e29b-41d4-a716-446655440010",
    });

    expect(response.statusCode).toBe(200);
    expect(getNotification).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440010",
    );
    expect(response.json()).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440010",
      status: "SENT",
    });
  });

  it("returns 404 when the notification does not exist", async () => {
    getNotification.mockResolvedValueOnce(null);

    const response = await server.inject({
      method: "GET",
      url: "/notifications/550e8400-e29b-41d4-a716-446655440099",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      message: "Notification not found",
    });
  });
});
