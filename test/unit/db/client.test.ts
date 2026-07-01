import { beforeEach, describe, expect, it, vi } from "vitest";

const drizzleMock = vi.fn((client) => ({ client }));
const clientConstructorMock = vi.fn(function MockPgClient(
  this: { options?: unknown },
  options,
) {
  this.options = options;
});

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: drizzleMock,
}));

vi.mock("pg", () => ({
  Client: clientConstructorMock,
}));

vi.mock("../../../src/config/env.js", () => ({
  env: {
    DATABASE_URL:
      "postgres://postgres:postgres@localhost:5432/notification_system",
  },
}));

describe("createDbClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a pg client and wraps it with drizzle", async () => {
    const { createDbClient } = await import("../../../src/db/client.js");

    const dbClient = createDbClient();

    expect(clientConstructorMock).toHaveBeenCalledWith({
      connectionString:
        "postgres://postgres:postgres@localhost:5432/notification_system",
    });
    expect(drizzleMock).toHaveBeenCalledTimes(1);

    const drizzleCallArguments = drizzleMock.mock.calls[0];

    expect(drizzleCallArguments).toBeDefined();
    expect(drizzleCallArguments?.[0]).toEqual({
      options: {
        connectionString:
          "postgres://postgres:postgres@localhost:5432/notification_system",
      },
    });
    expect((drizzleCallArguments as unknown[])[1]).toEqual(
      expect.objectContaining({
        schema: expect.any(Object),
      }),
    );
    expect(dbClient).toEqual({
      client: {
        options: {
          connectionString:
            "postgres://postgres:postgres@localhost:5432/notification_system",
        },
      },
      db: {
        client: {
          options: {
            connectionString:
              "postgres://postgres:postgres@localhost:5432/notification_system",
          },
        },
      },
    });
  });
});
