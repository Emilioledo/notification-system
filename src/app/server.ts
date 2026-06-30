import { buildServer } from "./build-server.js";
import { env } from "../config/env.js";

async function start() {
  const server = buildServer();

  try {
    await server.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });
  } catch (error) {
    server.log.error({ error }, "Failed to start API server");
    process.exitCode = 1;
  }
}

void start();
