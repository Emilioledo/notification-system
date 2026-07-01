import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import { env } from "../config/env.js";

export function createDbClient() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  return {
    db: drizzle(client),
    client,
  };
}
