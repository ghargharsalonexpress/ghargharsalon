import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import type { Config } from "../../config";
import type { Logger } from "../../logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Template name, for logs and tests. */
  tag: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/** Keeps messages in memory: tests and the E2E server read them back. */
export class MemoryTransport implements EmailTransport {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    if (this.sent.length > 200) this.sent.shift();
  }

  latestTo(address: string): EmailMessage | undefined {
    return this.sent.findLast((message) => message.to === address.toLowerCase());
  }
}

/** Development: logs each email and writes it to EMAIL_LOG_DIR as .html you can open. */
class LogTransport implements EmailTransport {
  constructor(
    private readonly logger: Logger,
    private readonly dir?: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    let file: string | undefined;
    if (this.dir) {
      await mkdir(this.dir, { recursive: true });
      file = join(this.dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.tag}.html`);
      await writeFile(file, message.html, "utf8");
    }
    this.logger.info({ to: message.to, subject: message.subject, tag: message.tag, file }, "email (not sent: log transport)");
  }
}

/** Production: Amazon SES (plan C10). */
class SesTransport implements EmailTransport {
  private readonly client: SESv2Client;

  constructor(
    region: string,
    private readonly from: string,
  ) {
    this.client = new SESv2Client({ region });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: { Html: { Data: message.html, Charset: "UTF-8" }, Text: { Data: message.text, Charset: "UTF-8" } },
          },
        },
        EmailTags: [{ Name: "template", Value: message.tag }],
      }),
    );
  }
}

export function createEmailTransport(config: Config, logger: Logger): EmailTransport {
  switch (config.EMAIL_TRANSPORT) {
    case "ses":
      return new SesTransport(config.AWS_REGION, config.EMAIL_FROM);
    case "memory":
      return new MemoryTransport();
    case "log":
      return new LogTransport(logger, config.EMAIL_LOG_DIR);
  }
}
