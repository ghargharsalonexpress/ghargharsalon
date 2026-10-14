import { type ApiErrorBody, type ErrorCode, ERRORS, isErrorCode, type SessionDto } from "@brand/shared";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
/** For plain links to the API (file downloads such as the bookings CSV). */
export const API_BASE_URL = BASE_URL;

/** Every failed call becomes one of these; screens show `messageKey` through i18n. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "NETWORK",
    readonly messageKey: string,
    /** Field path → validation message key. */
    readonly fields: Record<string, string> = {},
    readonly requestId?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** From GET /v1/session; sent on every mutation (plan C11). */
let csrfToken = "";
let sessionRequest: Promise<SessionDto> | null = null;

/**
 * GET /v1/session, shared by everyone who asks at the same moment. Two parallel reads without
 * a cookie would each be issued a different CSRF token, and only one of their cookies survives.
 */
export function loadSession(): Promise<SessionDto> {
  sessionRequest ??= request<SessionDto>("GET", "/v1/session")
    .then((session) => {
      csrfToken = session.csrfToken;
      return session;
    })
    .finally(() => {
      sessionRequest = null;
    });
  return sessionRequest;
}

let authLostListener: (() => void) | undefined;
/** Called when the API says the session is gone (expired, revoked or signed out elsewhere). */
export const onAuthLost = (listener: () => void): void => {
  authLostListener = listener;
};

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function toApiError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | undefined;
  try {
    body = (await res.json()) as Partial<ApiErrorBody>;
  } catch {
    // Not JSON (a proxy error page, for example).
  }
  const error = body?.error;
  const code: ErrorCode = isErrorCode(error?.code) ? error.code : res.status >= 500 ? "INTERNAL" : "VALIDATION_FAILED";
  const header = Number(res.headers.get("Retry-After"));
  return new ApiError(
    res.status,
    code,
    error?.messageKey ?? ERRORS[code].messageKey,
    error?.fields ?? {},
    error?.requestId ?? res.headers.get("X-Request-Id") ?? undefined,
    error?.retryAfterSeconds ?? (Number.isFinite(header) && header > 0 ? header : undefined),
  );
}

async function request<T>(method: Method, path: string, body?: unknown, signal?: AbortSignal, retried = false, extraHeaders: Record<string, string> = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...extraHeaders };
  const isForm = body instanceof FormData;
  // FormData sets its own multipart boundary; everything else is JSON.
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    // A mutation before the session has loaded (e.g. the cart pricing on first paint) waits for the token.
    if (!csrfToken) await loadSession();
    headers["X-CSRF-Token"] = csrfToken;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "NETWORK", "errors.network");
  }

  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

  const error = await toApiError(res);
  // A stale token (e.g. cookies cleared in another tab): fetch a fresh one and try once more.
  if (error.code === "CSRF_FAILED" && !retried) {
    csrfToken = "";
    await loadSession();
    return request<T>(method, path, body, signal, true, extraHeaders);
  }
  if (error.code === "AUTH_REQUIRED") authLostListener?.();
  throw error;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body: unknown = {}, headers?: Record<string, string>) => request<T>("POST", path, body, undefined, false, headers),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  /** Multipart upload (admin images); CSRF and errors work as for every other call. */
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, form),
};
