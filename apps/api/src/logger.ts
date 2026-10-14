import { type Logger, pino } from "pino";
import type { Config } from "./config";

export type { Logger };

/** JSON logs (shipped to CloudWatch in production); readable lines in development. Secrets are redacted. */
export function createLogger(config: Pick<Config, "LOG_LEVEL" | "NODE_ENV">): Logger {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: "api" },
    redact: {
      paths: [
        "req.headers.cookie",
        "req.headers.authorization",
        'req.headers["x-csrf-token"]',
        'res.headers["set-cookie"]',
        "*.password",
        "*.passwordHash",
        "*.token",
      ],
      censor: "[redacted]",
    },
    ...(config.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname,service" } } }
      : {}),
  });
}
