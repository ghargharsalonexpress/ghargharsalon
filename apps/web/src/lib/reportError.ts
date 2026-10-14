import type { ClientErrorInput } from "@brand/shared";
import { api, ApiError } from "./api";

/** At most this many reports per page load, each message once: a crash loop can't flood the API. */
const MAX_PER_PAGE = 5;
const sent = new Set<string>();
const enabled = import.meta.env.PROD || import.meta.env.VITE_REPORT_ERRORS === "1";

/**
 * Sends a browser crash to the team (plan C3, C13: our own endpoint, no third-party tracker).
 * Only the path is sent, never the query string (it can hold a reset token). API errors are
 * already logged by the server, so they are skipped.
 */
export function reportClientError(kind: ClientErrorInput["kind"], error: unknown): void {
  if (!enabled || error instanceof ApiError) return;
  const message = (error instanceof Error ? error.message : String(error ?? "")).slice(0, 500) || "Unknown error";
  if (sent.size >= MAX_PER_PAGE || sent.has(message)) return;
  sent.add(message);
  const stack = error instanceof Error && error.stack ? error.stack.slice(0, 4000) : undefined;
  const release = import.meta.env.VITE_RELEASE;
  void api
    .post<void>("/v1/client-errors", { kind, message, url: window.location.pathname.slice(0, 500), ...(stack ? { stack } : {}), ...(release ? { release } : {}) })
    .catch(() => undefined);
}

/** Uncaught errors and unhandled promise rejections, once per page load. */
export function installErrorReporting(): void {
  if (!enabled) return;
  window.addEventListener("error", (event) => reportClientError("error", event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportClientError("rejection", event.reason));
}
