import mongoose from "mongoose";
import { Address } from "./modules/addresses/addresses";
import { AuditLog } from "./modules/audit/audit.model";
import { LoginCode } from "./modules/auth/loginCode";
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
import { AreaRequest, Page, PageVersion, SiteHistory, SiteModel } from "./modules/site/site.models";
import { Counter } from "./modules/system/counters";
import { IdempotencyKey } from "./modules/system/idempotency";
import { Outbox } from "./modules/system/outbox";
import { duplicatePhones, User } from "./modules/users/user.model";

// Unknown filter keys are dropped instead of matching everything (plan C11).
mongoose.set("strictQuery", true);

const MODELS = [
  User,
  AuthToken,
  LoginCode,
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
  SiteModel,
  SiteHistory,
  Page,
  PageVersion,
  AreaRequest,
];

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 10_000 });
}

/**
 * Before mobile login (ADR-0020) every user had an email, and `email_1` made it unique across
 * all users, including "no email". Only scripts/migrate-otp-login.ts removes it: start-up never
 * drops anything, so an older API sharing the database keeps working.
 */
export const LEGACY_EMAIL_INDEX = "email_1";

export async function hasLegacyEmailIndex(): Promise<boolean> {
  const indexes = await User.collection.indexes().catch(() => []);
  return indexes.some((index) => index.name === LEGACY_EMAIL_INDEX);
}

/** The go-live step (scripts/migrate-otp-login.ts): removes the old email index. */
export async function dropLegacyEmailIndex(): Promise<boolean> {
  if (!(await hasLegacyEmailIndex())) return false;
  await User.collection.dropIndex(LEGACY_EMAIL_INDEX);
  return true;
}

/**
 * Creates missing indexes (unique, TTL). Idempotent and only additive, so it runs on every
 * start-up. `warn` reports what needs scripts/migrate-otp-login.ts: the old email index (a
 * second customer without an email would be refused), or a number on two accounts (the unique
 * phone index can't be built; sign-up still checks the number itself).
 */
export async function ensureIndexes(warn: (message: string) => void = console.warn): Promise<void> {
  if (await hasLegacyEmailIndex()) warn(`users: the old "${LEGACY_EMAIL_INDEX}" index is still there, so only one customer can sign up without an email. Run scripts/migrate-otp-login.ts.`);
  for (const model of MODELS) {
    try {
      await model.createIndexes();
    } catch (error) {
      if (model !== User) throw error;
      const duplicates = await duplicatePhones();
      if (duplicates.length === 0) throw error;
      warn(`users: ${duplicates.length} phone number(s) belong to more than one account, so the unique phone index was not created. Run scripts/migrate-otp-login.ts.`);
    }
  }
}

export const disconnectDb = (): Promise<void> => mongoose.disconnect();
