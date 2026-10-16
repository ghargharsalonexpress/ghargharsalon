import type { Config } from "../../config";
import type { Logger } from "../../logger";

/** The three approved utility templates (plan C10). Each one is registered with Meta by name. */
export const WHATSAPP_TEMPLATES = {
  onTheWay: "pro_on_the_way",
  noProfessional: "no_professional_refund",
  completed: "booking_completed",
} as const;

export type WhatsappTemplate = (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

export interface WhatsappMessage {
  phone: string;
  template: WhatsappTemplate;
  /** Body placeholders in order, as Meta's template defines them. */
  variables: string[];
  /** Appended to the template's URL button, e.g. a booking id. */
  buttonParam?: string;
  language?: "en" | "hi";
}

export interface WhatsappTransport {
  send(message: WhatsappMessage): Promise<void>;
}

/** Keeps messages in memory: tests and the E2E server read them back. */
export class MemoryWhatsappTransport implements WhatsappTransport {
  readonly sent: Array<WhatsappMessage & { at: Date }> = [];

  async send(message: WhatsappMessage): Promise<void> {
    this.sent.push({ ...message, at: new Date() });
    if (this.sent.length > 200) this.sent.shift();
  }

  latestTo(phone: string): WhatsappMessage | undefined {
    return this.sent.findLast((message) => message.phone === phone);
  }
}

/** Development: the message appears in the API's log instead of going to Meta. */
class LogWhatsappTransport implements WhatsappTransport {
  constructor(private readonly logger: Logger) {}

  async send(message: WhatsappMessage): Promise<void> {
    this.logger.info({ ...message }, "whatsapp (not sent: WHATSAPP_TRANSPORT=log)");
  }
}

/**
 * Meta's WhatsApp Cloud API. Only **utility** templates are used: they are about a booking the
 * customer already made, cost a fraction of a marketing template, and do not need an opt-in
 * beyond the one they gave by booking.
 */
export class CloudWhatsappTransport implements WhatsappTransport {
  constructor(
    private readonly phoneNumberId: string,
    private readonly token: string,
    private readonly fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = fetch,
  ) {}

  async send({ phone, template, variables, buttonParam, language = "en" }: WhatsappMessage): Promise<void> {
    const components: unknown[] = [];
    if (variables.length > 0) {
      components.push({ type: "body", parameters: variables.map((text) => ({ type: "text", text })) });
    }
    if (buttonParam) {
      components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: buttonParam }] });
    }

    const response = await this.fetchImpl(`https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: { name: template, language: { code: language === "hi" ? "hi" : "en" }, components },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(`WhatsApp refused the message (HTTP ${response.status}${body?.error?.message ? `: ${body.error.message}` : ""})`);
    }
  }
}

export function createWhatsappTransport(config: Config, logger: Logger): WhatsappTransport {
  switch (config.WHATSAPP_TRANSPORT) {
    case "cloud":
      if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_TOKEN) throw new Error("WHATSAPP_TRANSPORT=cloud needs WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN");
      return new CloudWhatsappTransport(config.WHATSAPP_PHONE_NUMBER_ID, config.WHATSAPP_TOKEN);
    case "memory":
      return new MemoryWhatsappTransport();
    case "log":
      return new LogWhatsappTransport(logger);
  }
}
