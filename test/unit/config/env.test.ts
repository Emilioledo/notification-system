import { describe, expect, it } from "vitest";

import { parseEnv } from "../../../src/config/env.js";

describe("parseEnv", () => {
  it("derives DATABASE_URL from POSTGRES_* variables", () => {
    const env = parseEnv({
      POSTGRES_HOST: "db.internal",
      POSTGRES_PORT: "5433",
      POSTGRES_DB: "notifications",
      POSTGRES_USER: "service-user",
      POSTGRES_PASSWORD: "s3cr3t",
      DATABASE_URL: "",
      REDIS_PASSWORD: "",
    });

    expect(env.DATABASE_URL).toBe(
      "postgres://service-user:s3cr3t@db.internal:5433/notifications",
    );
    expect(env.REDIS_PASSWORD).toBeUndefined();
  });

  it("uses an explicit DATABASE_URL when provided", () => {
    const env = parseEnv({
      DATABASE_URL: "postgres://custom-user:pw@localhost:5432/custom_db",
    });

    expect(env.DATABASE_URL).toBe(
      "postgres://custom-user:pw@localhost:5432/custom_db",
    );
  });

  it("applies defaults and coerces numeric values", () => {
    const env = parseEnv({
      PORT: "4000",
      REDIS_PORT: "6380",
      REDIS_DB: "2",
      WORKER_CONCURRENCY: "8",
      MAX_RETRY_ATTEMPTS: "5",
      RETRY_BACKOFF_MS: "2500",
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(4000);
    expect(env.REDIS_PORT).toBe(6380);
    expect(env.REDIS_DB).toBe(2);
    expect(env.WORKER_CONCURRENCY).toBe(8);
    expect(env.MAX_RETRY_ATTEMPTS).toBe(5);
    expect(env.RETRY_BACKOFF_MS).toBe(2500);
  });

  it("rejects invalid numeric values", () => {
    expect(() => parseEnv({ PORT: "0" })).toThrow();
    expect(() => parseEnv({ REDIS_DB: "-1" })).toThrow();
  });
});
