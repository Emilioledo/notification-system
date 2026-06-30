import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildServer } from "../../src/app/build-server.js";

describe("GET /health", () => {
  const server = buildServer();

  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns basic service health information", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "notification-system-api",
    });
  });
});
