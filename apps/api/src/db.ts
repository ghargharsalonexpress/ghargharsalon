import mongoose from "mongoose";
import { Address } from "./modules/addresses/addresses";
import { AuditLog } from "./modules/audit/audit.model";
import { AuthToken } from "./modules/auth/token.model";
import { Quote } from "./modules/availability/availability.service";
import { Booking } from "./modules/bookings/booking.model";
import { LocationPing } from "./modules/jobs/jobs.service";
import { Offer } from "./modules/matching/offer.model";
import { Alert } from "./modules/notifications/notifications";
import { Category, Service } from "./modules/catalog/catalog.models";
import { ContactMessage } from "./modules/contact/contact.module";
import { Payment, Refund, WebhookEvent } from "./modules/payments/payment.model";
import { Professional } from "./modules/professionals/professional.model";
import { PushSubscription } from "./modules/professionals/push";
import { SettingsHistory, SettingsModel } from "./modules/settings/settings.service";
import { Counter } from "./modules/system/counters";
import { IdempotencyKey } from "./modules/system/idempotency";
import { Outbox } from "./modules/system/outbox";
import { User } from "./modules/users/user.model";

// Unknown filter keys are dropped instead of matching everything (plan C11).
mongoose.set("strictQuery", true);

const MODELS = [
  User,
  AuthToken,
  AuditLog,
  SettingsModel,
  SettingsHistory,
  Category,
  Service,
  ContactMessage,
  Professional,
  PushSubscription,
  Address,
  Quote,
  Booking,
  Payment,
  Refund,
  WebhookEvent,
  Counter,
  IdempotencyKey,
  Outbox,
  Offer,
  Alert,
  LocationPing,
];

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 10_000 });
}

/** Creates missing indexes (unique, TTL). Idempotent, so it runs on every start-up. */
export async function ensureIndexes(): Promise<void> {
  for (const model of MODELS) await model.createIndexes();
}

export const disconnectDb = (): Promise<void> => mongoose.disconnect();
