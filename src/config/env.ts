import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  POSTGRES_HOST: z.string().default("127.0.0.1"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1).default("notification_system"),
  POSTGRES_USER: z.string().min(1).default("postgres"),
  POSTGRES_PASSWORD: z.string().min(1).default("postgres"),
  DATABASE_URL: optionalString,
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: optionalString,
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  QUEUE_NAME: z.string().default("notifications"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
});

export function parseEnv(source: NodeJS.ProcessEnv) {
  const parsedEnv = envSchema.parse(source);

  const databaseUrl =
    parsedEnv.DATABASE_URL ??
    `postgres://${encodeURIComponent(parsedEnv.POSTGRES_USER)}:${encodeURIComponent(parsedEnv.POSTGRES_PASSWORD)}@${parsedEnv.POSTGRES_HOST}:${parsedEnv.POSTGRES_PORT}/${parsedEnv.POSTGRES_DB}`;

  return {
    ...parsedEnv,
    DATABASE_URL: databaseUrl,
  };
}

export const env = parseEnv(process.env);
