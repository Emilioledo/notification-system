import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn();
const endMock = vi.fn();
const pingMock = vi.fn();
const quitMock = vi.fn();
const queueCloseMock = vi.fn();
const workerCloseMock = vi.fn();
const loggerInfoMock = vi.fn();
const processNotificationMock = vi.fn();

vi.mock("../../../src/config/env.js", () => ({
  env: {
    QUEUE_NAME: "notifications",
    WORKER_CONCURRENCY: 5,
    MAX_RETRY_ATTEMPTS: 3,
  },
}));

vi.mock("../../../src/db/client.js", () => ({
  createDbClient: vi.fn(() => ({
    client: {
      connect: connectMock,
      end: endMock,
    },
    db: {},
  })),
}));

vi.mock("../../../src/modules/queue/queue.js", () => ({
  createQueue: vi.fn(() => ({
    connection: {
      ping: pingMock,
      quit: quitMock,
    },
    queue: {
      close: queueCloseMock,
    },
  })),
}));

vi.mock("../../../src/modules/queue/queue.worker.js", () => ({
  createQueueWorker: vi.fn(() => ({
    close: workerCloseMock,
  })),
}));

vi.mock("../../../src/modules/notifications/notification.repository.js", () => ({
  NotificationRepository: vi.fn(function MockNotificationRepository() {}),
}));

vi.mock("../../../src/modules/delivery/delivery.repository.js", () => ({
  DeliveryRepository: vi.fn(function MockDeliveryRepository() {}),
}));

vi.mock("../../../src/modules/delivery/delivery.service.js", () => ({
  DeliveryService: vi.fn(function MockDeliveryService(this: { processNotification?: unknown }) {
    this.processNotification = processNotificationMock;
  }),
}));

vi.mock("../../../src/modules/providers/email.provider.js", () => ({
  EmailProvider: vi.fn(function MockEmailProvider(this: { name?: string }) {
    this.name = "email";
  }),
}));

vi.mock("../../../src/modules/providers/sms.provider.js", () => ({
  SmsProvider: vi.fn(function MockSmsProvider(this: { name?: string }) {
    this.name = "sms";
  }),
}));

vi.mock("../../../src/shared/logger.js", () => ({
  logger: {
    info: loggerInfoMock,
  },
}));

describe("startWorker", () => {
  const signalHandlers = new Map<string, (signal: NodeJS.Signals) => Promise<void>>();
  let onceSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    signalHandlers.clear();

    onceSpy = vi
      .spyOn(process, "once")
      .mockImplementation(((event: string, handler: (signal: NodeJS.Signals) => Promise<void>) => {
        signalHandlers.set(event, handler);
        return process;
      }) as typeof process.once);

    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: string | number | null) => code as never) as typeof process.exit);
  });

  afterEach(() => {
    onceSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("boots successfully and registers shutdown handlers", async () => {
    connectMock.mockResolvedValueOnce(undefined);
    pingMock.mockResolvedValueOnce("PONG");
    workerCloseMock.mockResolvedValue(undefined);

    const { startWorker } = await import("../../../src/app/worker.js");

    await startWorker();

    expect(connectMock).toHaveBeenCalledOnce();
    expect(pingMock).toHaveBeenCalledOnce();
    expect(loggerInfoMock).toHaveBeenCalledWith(
      {
        queueName: "notifications",
        concurrency: 5,
        maxRetryAttempts: 3,
      },
      "Worker bootstrap completed",
    );
    expect(signalHandlers.has("SIGINT")).toBe(true);
    expect(signalHandlers.has("SIGTERM")).toBe(true);
  });

  it("closes dependencies on shutdown", async () => {
    connectMock.mockResolvedValueOnce(undefined);
    pingMock.mockResolvedValueOnce("PONG");
    queueCloseMock.mockResolvedValueOnce(undefined);
    workerCloseMock.mockResolvedValueOnce(undefined);
    quitMock.mockResolvedValueOnce("OK");
    endMock.mockResolvedValueOnce(undefined);

    const { startWorker } = await import("../../../src/app/worker.js");

    await startWorker();

    const shutdownHandler = signalHandlers.get("SIGTERM");
    expect(shutdownHandler).toBeDefined();

    await shutdownHandler?.("SIGTERM");

    expect(loggerInfoMock).toHaveBeenCalledWith(
      { signal: "SIGTERM" },
      "Worker shutdown requested",
    );
    expect(workerCloseMock).toHaveBeenCalledOnce();
    expect(queueCloseMock).toHaveBeenCalledOnce();
    expect(quitMock).toHaveBeenCalledOnce();
    expect(endMock).toHaveBeenCalledOnce();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
