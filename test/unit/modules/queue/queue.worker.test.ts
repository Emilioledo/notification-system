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

vi.mock("../../../../src/modules/delivery/delivery.errors.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../src/modules/delivery/delivery.errors.js")
  >("../../../../src/modules/delivery/delivery.errors.js");

  return actual;
});

describe("createQueueWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a BullMQ worker bound to the notifications queue", async () => {
    const { createQueueWorker } =
      await import("../../../../src/modules/queue/queue.worker.js");

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

  it("discards permanent delivery errors to avoid retries", async () => {
    const { createQueueWorker } = await import(
      "../../../../src/modules/queue/queue.worker.js"
    );
    const { DeliveryError } = await import(
      "../../../../src/modules/delivery/delivery.errors.js"
    );

    const processor = vi.fn().mockRejectedValueOnce(
      new DeliveryError("invalid recipient", "permanent", "INVALID_RECIPIENT"),
    );

    createQueueWorker(processor);

    const processorWrapper = workerConstructorMock.mock.calls[0]?.[1] as (
      job: {
        data: { notificationId: string; attempt: number };
        attemptsStarted: number;
        discard: () => Promise<void>;
      },
    ) => Promise<void>;

    const discard = vi.fn().mockResolvedValueOnce(undefined);

    await expect(
      processorWrapper({
        data: {
          notificationId: "550e8400-e29b-41d4-a716-446655440010",
          attempt: 1,
        },
        attemptsStarted: 2,
        discard,
      }),
    ).rejects.toThrow("invalid recipient");

    expect(discard).toHaveBeenCalledOnce();
    expect(processor).toHaveBeenCalledWith({
      notificationId: "550e8400-e29b-41d4-a716-446655440010",
      attempt: 2,
    });
  });
});
