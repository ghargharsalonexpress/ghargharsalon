import type { PaymentProvider } from "@brand/shared";
import { model, Schema, type Types } from "mongoose";

export interface PaymentFields {
  bookingId: Types.ObjectId;
  provider: PaymentProvider;
  orderId: string;
  paymentId: string | null;
  amountPaise: number;
  status: "created" | "captured" | "failed" | "refunded";
  method: string | null;
  capturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentFields>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    provider: { type: String, required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, default: null },
    amountPaise: { type: Number, required: true },
    status: { type: String, default: "created" },
    method: { type: String, default: null },
    capturedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } });
paymentSchema.index({ bookingId: 1, createdAt: -1 });
export const Payment = model<PaymentFields>("Payment", paymentSchema, "payments");

export interface RefundFields {
  bookingId: Types.ObjectId;
  /** The gateway's payment id being refunded. */
  paymentId: string;
  amountPaise: number;
  reason: string;
  status: "queued" | "pending" | "processed" | "failed";
  gatewayRefundId: string | null;
  /** One refund per booking and reason, however many times it is requested (plan C9). */
  idempotencyKey: string;
  initiatedBy: "system" | "admin" | "customer";
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<RefundFields>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    paymentId: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    status: { type: String, default: "queued" },
    gatewayRefundId: { type: String, default: null },
    idempotencyKey: { type: String, required: true },
    initiatedBy: { type: String, required: true },
    lastError: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
refundSchema.index({ idempotencyKey: 1 }, { unique: true });
refundSchema.index({ bookingId: 1 });
refundSchema.index({ gatewayRefundId: 1 }, { partialFilterExpression: { gatewayRefundId: { $type: "string" } } });
refundSchema.index({ status: 1, createdAt: -1 });
export const Refund = model<RefundFields>("Refund", refundSchema, "refunds");

interface WebhookEventFields {
  eventId: string;
  type: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventFields>({ eventId: { type: String, required: true }, type: String, processedAt: { type: Date, required: true } }, { versionKey: false });
webhookEventSchema.index({ eventId: 1 }, { unique: true });
// Kept 90 days (plan C5).
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
export const WebhookEvent = model<WebhookEventFields>("WebhookEvent", webhookEventSchema, "webhook_events");
