import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: process.env.RUN_E2E === "true" ? [] : ["test/e2e/**/*.test.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
