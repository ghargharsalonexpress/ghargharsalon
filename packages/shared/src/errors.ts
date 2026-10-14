/**
 * Every error the API can return (plan C12/C13). The web shows `messageKey` through
 * i18n, so wording lives in the locale files and both languages stay in step.
 */
export const ERRORS = {
  VALIDATION_FAILED: { status: 400, messageKey: "errors.validationFailed" },
  PAYMENT_VERIFICATION_FAILED: { status: 400, messageKey: "errors.paymentVerificationFailed" },
  OTP_INVALID: { status: 400, messageKey: "errors.otpInvalid" },
  TOKEN_INVALID: { status: 400, messageKey: "errors.tokenInvalid" },
  AUTH_REQUIRED: { status: 401, messageKey: "errors.authRequired" },
  INVALID_CREDENTIALS: { status: 401, messageKey: "errors.invalidCredentials" },
  ACCOUNT_BLOCKED: { status: 403, messageKey: "errors.accountBlocked" },
  ACCOUNT_SUSPENDED: { status: 403, messageKey: "errors.accountSuspended" },
  FORBIDDEN: { status: 403, messageKey: "errors.forbidden" },
  CSRF_FAILED: { status: 403, messageKey: "errors.csrfFailed" },
  ORIGIN_NOT_ALLOWED: { status: 403, messageKey: "errors.originNotAllowed" },
  PRO_NOT_VERIFIED: { status: 403, messageKey: "errors.proNotVerified" },
  NOT_FOUND: { status: 404, messageKey: "errors.notFound" },
  PRO_BUSY: { status: 409, messageKey: "errors.proBusy" },
  NO_PROFESSIONALS: { status: 409, messageKey: "errors.noProfessionals" },
  QUOTE_EXPIRED: { status: 409, messageKey: "errors.quoteExpired" },
  PRICE_CHANGED: { status: 409, messageKey: "errors.priceChanged" },
  CART_UNAVAILABLE: { status: 409, messageKey: "errors.cartUnavailable" },
  BOOKING_STATE: { status: 409, messageKey: "errors.bookingState" },
  CONFIRM_REQUIRED: { status: 409, messageKey: "errors.confirmRequired" },
  IDEMPOTENCY_CONFLICT: { status: 409, messageKey: "errors.idempotencyConflict" },
  OFFER_TAKEN: { status: 409, messageKey: "errors.offerTaken" },
  REVIEW_EXISTS: { status: 409, messageKey: "errors.reviewExists" },
  OFFER_EXPIRED: { status: 410, messageKey: "errors.offerExpired" },
  OUTSIDE_AREA: { status: 422, messageKey: "errors.outsideArea" },
  OUTSIDE_HOURS: { status: 422, messageKey: "errors.outsideHours" },
  OTP_LOCKED: { status: 423, messageKey: "errors.otpLocked" },
  EMAIL_TAKEN: { status: 409, messageKey: "errors.emailTaken" },
  VERSION_CONFLICT: { status: 409, messageKey: "errors.versionConflict" },
  TOKEN_EXPIRED: { status: 410, messageKey: "errors.tokenExpired" },
  TOKEN_USED: { status: 410, messageKey: "errors.tokenUsed" },
  PAYLOAD_TOO_LARGE: { status: 413, messageKey: "errors.payloadTooLarge" },
  RATE_LIMITED: { status: 429, messageKey: "errors.rateLimited" },
  INTERNAL: { status: 500, messageKey: "errors.internal" },
  SERVICE_UNAVAILABLE: { status: 503, messageKey: "errors.serviceUnavailable" },
} as const satisfies Record<string, { status: number; messageKey: string }>;

export type ErrorCode = keyof typeof ERRORS;

export const isErrorCode = (value: unknown): value is ErrorCode => typeof value === "string" && Object.hasOwn(ERRORS, value);

/** Body of every non-2xx API response. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    messageKey: string;
    /** Field path → validation message key, e.g. { email: "validation.email" }. */
    fields?: Record<string, string>;
    requestId?: string;
    /** Present on RATE_LIMITED. */
    retryAfterSeconds?: number;
  };
}
