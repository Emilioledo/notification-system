import { beforeEach, describe, expect, it, vi } from "vitest";

const queueConstructorMock = vi.fn(function MockQueue(
  this: { name?: unknown; options?: unknown },
  name,
  options,
) {
  this.name = name;
  this.options = options;
});
const redisConstructorMock = vi.fn(function MockRedis(this: { options?: unknown }, options) {
  this.options = options;
});

vi.mock("bullmq", () => ({
  Queue: queueConstructorMock,
}));

vi.mock("ioredis", () => ({
  Redis: redisConstructorMock,
}));

vi.mock("../../../../src/config/env.js", () => ({
  env: {
    REDIS_HOST: "redis.internal",
    REDIS_PORT: 6381,
    REDIS_PASSWORD: undefined,
    REDIS_DB: 4,
    QUEUE_NAME: "notifications",
  },
}));

describe("createQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Redis connection and a BullMQ queue with the same options", async () => {
    const { createQueue } = await import("../../../../src/modules/queue/queue.js");

    const result = createQueue();

    const expectedOptions = {
      host: "redis.internal",
      port: 6381,
      password: undefined,
      db: 4,
      maxRetriesPerRequest: null,
    };

    expect(redisConstructorMock).toHaveBeenCalledWith(expectedOptions);
    expect(queueConstructorMock).toHaveBeenCalledWith("notifications", {
      connection: expectedOptions,
    });
    expect(result).toEqual({
      connection: { options: expectedOptions },
      queue: {
        name: "notifications",
        options: {
          connection: expectedOptions,
        },
      },
    });
  });
});
