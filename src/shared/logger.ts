import pino, { type LoggerOptions } from "pino";

import { env } from "../config/env.js";

const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
};

if (env.NODE_ENV === "development") {
  loggerOptions.transport = {
    target: "pino-pretty",
    options: {
      translateTime: "SYS:standard",
      colorize: true,
    },
  };
}

export const logger = pino(loggerOptions);
