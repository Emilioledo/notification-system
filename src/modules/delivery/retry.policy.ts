import { env } from "../../config/env.js";

export function getRetryAttempts() {
  return env.MAX_RETRY_ATTEMPTS;
}

export function getRetryBackoffMs() {
  return env.RETRY_BACKOFF_MS;
}
