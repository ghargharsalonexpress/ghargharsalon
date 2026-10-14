import { type ApiErrorBody, type ErrorCode, ERRORS } from "@brand/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";

interface AppErrorOptions {
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
  /** For logs only; never sent to the client. */
  detail?: string;
  cause?: unknown;
}

/** Every expected failure. The code decides the HTTP status and the client-facing message key. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;
  readonly retryAfterSeconds?: number;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.detail ?? code, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  get status(): number {
    return ERRORS[this.code].status;
  }
}

export const notFound: RequestHandler = () => {
  throw new AppError("NOT_FOUND");
};

interface BodyParserError {
  type: string;
  status?: number;
}

const isBodyParserError = (error: unknown): error is BodyParserError =>
  typeof error === "object" && error !== null && "type" in error && typeof (error as { type: unknown }).type === "string";

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isBodyParserError(error)) {
    if (error.type === "entity.too.large") return new AppError("PAYLOAD_TOO_LARGE");
    if (error.status && error.status < 500) return new AppError("VALIDATION_FAILED", { detail: error.type });
  }
  return new AppError("INTERNAL", { cause: error });
}

/** One error shape for every response (plan C12). Stack traces never leave the server (C13). */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const appError = toAppError(error);
  if (appError.status >= 500) req.log.error({ err: error }, "request failed");
  else req.log.info({ code: appError.code, detail: appError.message }, "request rejected");

  if (appError.retryAfterSeconds) res.set("Retry-After", String(appError.retryAfterSeconds));

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      messageKey: ERRORS[appError.code].messageKey,
      requestId: String(req.id),
      ...(appError.fields ? { fields: appError.fields } : {}),
      ...(appError.retryAfterSeconds ? { retryAfterSeconds: appError.retryAfterSeconds } : {}),
    },
  };
  res.status(appError.status).json(body);
};
