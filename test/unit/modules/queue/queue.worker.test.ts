import { beforeEach, describe, expect, it, vi } from "vitest";

const workerConstructorMock = vi.fn(function MockWorker(
  this: { name?: unknown; processor?: unknown; options?: unknown },
  name,
  processor,
  options,
) {
  this.name = name;
  this.processor = processor;
  this.options = options;
});

vi.mock("bullmq", () => ({
  Worker: workerConstructorMock,
}));

vi.mock("../../../../src/config/env.js", () => ({
  env: {
    QUEUE_NAME: "notifications",
    WORKER_CONCURRENCY: 7,
    REDIS_HOST: "redis.internal",
    REDIS_PORT: 6381,
    REDIS_PASSWORD: undefined,
    REDIS_DB: 2,
  },
}));

describe("createQueueWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a BullMQ worker bound to the notifications queue", async () => {
    const { createQueueWorker } = await import(
      "../../../../src/modules/queue/queue.worker.js"
    );

    const processor = vi.fn();
    createQueueWorker(processor);

    expect(workerConstructorMock).toHaveBeenCalledTimes(1);
    expect(workerConstructorMock).toHaveBeenCalledWith(
      "notifications",
      expect.any(Function),
      {
        connection: {
          host: "redis.internal",
          port: 6381,
          password: undefined,
          db: 2,
          maxRetriesPerRequest: null,
        },
        concurrency: 7,
      },
    );
  });
});
