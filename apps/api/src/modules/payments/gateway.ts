import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "@brand/shared";
import type { Config } from "../../config";

/**
 * Payments behind one interface (plan C9): Razorpay in staging and production, a local
 * gateway in development and tests that behaves the same way (orders, signed payments,
 * refunds, webhooks), so every money path can run without the client's keys.
 */
export interface CreatedOrder {
  orderId: string;
}

export interface GatewayPayment {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string | null;
}

export interface GatewayRefund {
  refundId: string;
  status: "pending" | "processed" | "failed";
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  /** Public key id for Razorpay Checkout; null for the local gateway. */
  readonly keyId: string | null;
  createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<CreatedOrder>;
  /** Checkout's handler signature: HMAC-SHA256(orderId|paymentId) with the key secret. */
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  /** Webhook signature: HMAC-SHA256(raw body) with the webhook secret. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  /** Payments made against an order (reconciliation). */
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
  refund(input: { paymentId: string; amountPaise: number; speed: "optimum" | "normal"; receipt: string; notes: Record<string, string> }): Promise<GatewayRefund>;
}

const hmac = (secret: string, data: string | Buffer) => createHmac("sha256", secret).update(data).digest("hex");

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---------- Razorpay (REST, https://razorpay.com/docs/api) ----------

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  status: GatewayPayment["status"];
  method?: string;
}

export class RazorpayGateway implements PaymentGateway {
  readonly provider = "razorpay" as const;
  readonly keyId: string;
  private readonly secret: string;
  private readonly webhookSecret: string;

  constructor(config: Config) {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET || !config.RAZORPAY_WEBHOOK_SECRET) throw new Error("Razorpay keys are not configured");
    this.keyId = config.RAZORPAY_KEY_ID;
    this.secret = config.RAZORPAY_KEY_SECRET;
    this.webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.secret}`).toString("base64")}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await response.json().catch(() => ({}))) as T & { error?: { code?: string; description?: string } };
    if (!response.ok) throw new Error(`Razorpay ${method} ${path} → ${response.status} ${json.error?.code ?? ""} ${json.error?.description ?? ""}`.trim());
    return json;
  }

  async createOrder({ amountPaise, receipt, notes }: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<CreatedOrder> {
    const order = await this.call<{ id: string }>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes, payment_capture: 1 });
    return { orderId: order.id };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }): boolean {
    return safeEqualHex(hmac(this.secret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return safeEqualHex(hmac(this.webhookSecret, rawBody), signature);
  }

  private toPayment(payment: RazorpayPayment): GatewayPayment {
    return { paymentId: payment.id, orderId: payment.order_id, amountPaise: payment.amount, status: payment.status, method: payment.method ?? null };
  }

  async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    return this.toPayment(await this.call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`));
  }

  async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    const list = await this.call<{ items: RazorpayPayment[] }>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
    return list.items.map((payment) => this.toPayment(payment));
  }

  async refund({ paymentId, amountPaise, speed, receipt, notes }: { paymentId: string; amountPaise: number; speed: "optimum" | "normal"; receipt: string; notes: Record<string, string> }): Promise<GatewayRefund> {
    const refund = await this.call<{ id: string; status: "pending" | "processed" | "failed" }>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed, receipt, notes });
    return { refundId: refund.id, status: refund.status };
  }
}

// ---------- local gateway (development and tests) ----------

interface LocalOrder {
  orderId: string;
  amountPaise: number;
  payments: GatewayPayment[];
}

/**
 * Behaves like Razorpay without leaving the machine. The web's test payment sheet calls
 * `pay()` (through a development-only route) and gets back a payment id and signature that
 * verify exactly as Checkout's would.
 */
export class LocalGateway implements PaymentGateway {
  readonly provider = "fake" as const;
  readonly keyId = null;
  private readonly secret: string;
  private readonly orders = new Map<string, LocalOrder>();
  readonly refunds: Array<{ refundId: string; paymentId: string; amountPaise: number }> = [];

  constructor(secret: string) {
    this.secret = secret;
  }

  async createOrder({ amountPaise }: { amountPaise: number }): Promise<CreatedOrder> {
    const orderId = `order_local_${randomBytes(8).toString("hex")}`;
    this.orders.set(orderId, { orderId, amountPaise, payments: [] });
    return { orderId };
  }

  /** The customer completes (or fails) a payment on the test sheet. */
  pay(orderId: string, outcome: "success" | "failure", amountPaise: number): { paymentId: string; signature: string } {
    // Orders live in memory; after a development restart the booking's amount recreates them.
    const order = this.orders.get(orderId) ?? { orderId, amountPaise, payments: [] };
    this.orders.set(orderId, order);
    const paymentId = `pay_local_${randomBytes(8).toString("hex")}`;
    order.payments.push({ paymentId, orderId, amountPaise: order.amountPaise, status: outcome === "success" ? "captured" : "failed", method: "upi" });
    return { paymentId, signature: hmac(this.secret, `${orderId}|${paymentId}`) };
  }

  /** Signs a webhook body the way Razorpay would (tests). */
  signWebhook(rawBody: string): string {
    return hmac(this.secret, rawBody);
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }): boolean {
    return safeEqualHex(hmac(this.secret, `${orderId}|${paymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    return safeEqualHex(hmac(this.secret, rawBody), signature);
  }

  async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    for (const order of this.orders.values()) {
      const payment = order.payments.find((candidate) => candidate.paymentId === paymentId);
      if (payment) return payment;
    }
    throw new Error(`unknown payment ${paymentId}`);
  }

  async fetchOrderPayments(orderId: string): Promise<GatewayPayment[]> {
    return this.orders.get(orderId)?.payments ?? [];
  }

  async refund({ paymentId, amountPaise }: { paymentId: string; amountPaise: number }): Promise<GatewayRefund> {
    const refundId = `rfnd_local_${randomBytes(8).toString("hex")}`;
    this.refunds.push({ refundId, paymentId, amountPaise });
    return { refundId, status: "processed" };
  }
}

export function createGateway(config: Config): PaymentGateway {
  if (config.PAYMENT_PROVIDER === "razorpay") return new RazorpayGateway(config);
  // Derived from the session secret, so signatures survive restarts in development.
  return new LocalGateway(createHmac("sha256", config.SESSION_SECRET).update("local-payments").digest("hex"));
}
