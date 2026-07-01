import { describe, expect, it } from "vitest";

import drizzleConfig from "../../../drizzle.config.js";

const config = drizzleConfig as typeof drizzleConfig & {
  dbCredentials: {
    url: string;
  };
};

describe("drizzle config", () => {
  it("points to the project schema and migrations directories", () => {
    expect(config.schema).toBe("./src/db/schema/index.ts");
    expect(config.out).toBe("./src/db/migrations");
  });

  it("uses PostgreSQL with a runtime database URL", () => {
    expect(config.dialect).toBe("postgresql");
    expect(config.dbCredentials.url).toMatch(/^postgres:\/\//);
  });

  it("enables strict and verbose generation", () => {
    expect(config.strict).toBe(true);
    expect(config.verbose).toBe(true);
  });
});
