import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { buildServer } from "../../../src/app/build-server.js";

describe("POST /notifications", () => {
  const createNotification = vi.fn();
  const server = buildServer({
    notificationService: {
      createNotification,
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

  it("creates a notification and returns 201", async () => {
    createNotification.mockResolvedValueOnce({
      created: true,
      notification: {
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
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        body: "Hello",
        idempotencyKey: "notification-001",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createNotification).toHaveBeenCalledWith({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "email",
      recipient: "user@example.com",
      body: "Hello",
      idempotencyKey: "notification-001",
    });
    expect(response.json()).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440010",
      status: "PENDING",
    });
  });

  it("persists the expected request fields passed into the service", async () => {
    createNotification.mockResolvedValueOnce({
      created: true,
      notification: {
        id: "550e8400-e29b-41d4-a716-446655440011",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "sms",
        status: "PENDING",
        recipient: "+5491100000000",
        subject: null,
        body: null,
        templateId: "550e8400-e29b-41d4-a716-446655440001",
        templateData: { firstName: "Emilio" },
        idempotencyKey: "notification-002",
        externalRef: null,
        scheduledAt: null,
        lastError: null,
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "sms",
        recipient: "+5491100000000",
        templateId: "550e8400-e29b-41d4-a716-446655440001",
        templateData: {
          firstName: "Emilio",
        },
        idempotencyKey: "notification-002",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(createNotification).toHaveBeenCalledWith({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "sms",
      recipient: "+5491100000000",
      templateId: "550e8400-e29b-41d4-a716-446655440001",
      templateData: {
        firstName: "Emilio",
      },
      idempotencyKey: "notification-002",
    });
  });

  it("returns 200 for idempotent replays", async () => {
    createNotification.mockResolvedValueOnce({
      created: false,
      notification: {
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
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        body: "Hello",
        idempotencyKey: "notification-001",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects invalid payloads", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        channel: "email",
        recipient: "user@example.com",
        idempotencyKey: "notification-001",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: "Invalid notification payload",
    });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
