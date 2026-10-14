import type { Config } from "../../config";
import type { Logger } from "../../logger";

/** Sends the SMS login code (ADR-0020). The code is made and checked by the API, never by the SMS company. */
export interface SmsTransport {
  sendLoginCode(phone: string, code: string): Promise<void>;
}

/** Keeps codes in memory: tests and the E2E server read them back. */
export class MemorySmsTransport implements SmsTransport {
  readonly sent: Array<{ phone: string; code: string; at: Date }> = [];

  async sendLoginCode(phone: string, code: string): Promise<void> {
    this.sent.push({ phone, code, at: new Date() });
    if (this.sent.length > 500) this.sent.shift();
  }

  latestTo(phone: string): string | undefined {
    return this.sent.findLast((message) => message.phone === phone)?.code;
  }
}

/** Development: the code appears in the API's log ("Brand api" window) instead of an SMS. */
class LogSmsTransport implements SmsTransport {
  constructor(private readonly logger: Logger) {}

  async sendLoginCode(phone: string, code: string): Promise<void> {
    this.logger.info({ phone, code }, "login code (not sent: SMS_TRANSPORT=log)");
  }
}

/**
 * 2Factor.in: sends our code through the account's DLT-approved OTP template
 * (GET /API/V1/{key}/SMS/{91 + number}/{code}/{template}; the answer is JSON with Status
 * "Success" or "Error"). The key is part of the address, so the address is never logged.
 */
export class TwoFactorSmsTransport implements SmsTransport {
  constructor(
    private readonly apiKey: string,
    private readonly template: string | undefined,
    private readonly fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = fetch,
  ) {}

  async sendLoginCode(phone: string, code: string): Promise<void> {
    const parts = ["https://2factor.in/API/V1", encodeURIComponent(this.apiKey), "SMS", `91${phone}`, code];
    if (this.template) parts.push(encodeURIComponent(this.template));
    const response = await this.fetchImpl(parts.join("/"), { signal: AbortSignal.timeout(10_000) });
    const body = (await response.json().catch(() => null)) as { Status?: string; Details?: string } | null;
    if (!response.ok || body?.Status !== "Success") {
      throw new Error(`2Factor refused the SMS (HTTP ${response.status}${body?.Details ? `: ${body.Details}` : ""})`);
    }
  }
}

export function createSmsTransport(config: Config, logger: Logger): SmsTransport {
  switch (config.SMS_TRANSPORT) {
    case "2factor":
      if (!config.TWOFACTOR_API_KEY) throw new Error("SMS_TRANSPORT=2factor needs TWOFACTOR_API_KEY");
      return new TwoFactorSmsTransport(config.TWOFACTOR_API_KEY, config.TWOFACTOR_OTP_TEMPLATE);
    case "memory":
      return new MemorySmsTransport();
    case "log":
      return new LogSmsTransport(logger);
  }
}
