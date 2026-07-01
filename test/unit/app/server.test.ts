import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();
const errorLogMock = vi.fn();
const serverMock = {
  listen: listenMock,
  log: {
    error: errorLogMock,
  },
};

const connectMock = vi.fn();
const endMock = vi.fn();
const pingMock = vi.fn();
const quitMock = vi.fn();
const queueCloseMock = vi.fn();
const enqueueNotificationMock = vi.fn();

vi.mock("../../../src/app/build-server.js", () => ({
  buildServer: vi.fn(() => serverMock),
}));

vi.mock("../../../src/config/env.js", () => ({
  env: {
    PORT: 3000,
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
  createNotificationQueuePublisherFromQueue: vi.fn(() => ({
    enqueueNotification: enqueueNotificationMock,
  })),
}));

describe("startServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("starts the HTTP server after dependency checks succeed", async () => {
    connectMock.mockResolvedValueOnce(undefined);
    pingMock.mockResolvedValueOnce("PONG");
    listenMock.mockResolvedValueOnce(undefined);

    const { startServer } = await import("../../../src/app/server.js");

    await startServer();

    expect(connectMock).toHaveBeenCalledOnce();
    expect(pingMock).toHaveBeenCalledOnce();
    expect(listenMock).toHaveBeenCalledWith({
      host: "0.0.0.0",
      port: 3000,
    });
    expect(queueCloseMock).not.toHaveBeenCalled();
    expect(quitMock).not.toHaveBeenCalled();
    expect(endMock).not.toHaveBeenCalled();
  });

  it("logs the error and closes dependencies when startup fails", async () => {
    const startupError = new Error("database unavailable");
    connectMock.mockRejectedValueOnce(startupError);
    queueCloseMock.mockResolvedValueOnce(undefined);
    quitMock.mockResolvedValueOnce("OK");
    endMock.mockResolvedValueOnce(undefined);

    const { startServer } = await import("../../../src/app/server.js");

    await startServer();

    expect(errorLogMock).toHaveBeenCalledWith(
      { error: startupError },
      "Failed to start API server",
    );
    expect(process.exitCode).toBe(1);
    expect(queueCloseMock).toHaveBeenCalledOnce();
    expect(quitMock).toHaveBeenCalledOnce();
    expect(endMock).toHaveBeenCalledOnce();
  });
});
