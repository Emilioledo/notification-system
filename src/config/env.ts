import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@localhost:5432/notification_system"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().min(1).optional(),
  QUEUE_NAME: z.string().default("notifications"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
});

export const env = envSchema.parse(process.env);
