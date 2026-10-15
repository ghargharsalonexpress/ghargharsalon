import type { PageContent, SiteConfig } from "@brand/shared";
import { model, Schema, type Types } from "mongoose";

/** The one site configuration document (ADR-0021), versioned like the settings. */
interface SiteFields {
  _id: string;
  version: number;
  values: SiteConfig;
  /** Default pages created once; a default page an admin deleted is not brought back. */
  seededPages: string[];
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

const siteSchema = new Schema<SiteFields>(
  {
    _id: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    values: { type: Schema.Types.Mixed, required: true },
    seededPages: { type: [String], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true }, minimize: false, versionKey: false },
);

export const SiteModel = model<SiteFields>("Site", siteSchema, "site");

interface SiteHistoryFields {
  version: number;
  values: SiteConfig;
  changedBy: Types.ObjectId | null;
  changedAt: Date;
}

const siteHistorySchema = new Schema<SiteHistoryFields>(
  {
    version: { type: Number, required: true },
    values: { type: Schema.Types.Mixed, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true },
  },
  { minimize: false, versionKey: false },
);
siteHistorySchema.index({ version: -1 });

export const SiteHistory = model<SiteHistoryFields>("SiteHistory", siteHistorySchema, "site_history");

/** A page: the draft admins edit (`content`) and the copy visitors see (`published`). */
export interface PageFields {
  path: string;
  locked: boolean;
  content: PageContent;
  published: PageContent | null;
  publishedAt: Date | null;
  publishedBy: Types.ObjectId | null;
  /** How many times it was published; numbers the versions. */
  publishCount: number;
  /** Draft version, for optimistic concurrency. */
  version: number;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<PageFields>(
  {
    path: { type: String, required: true },
    locked: { type: Boolean, default: false },
    content: { type: Schema.Types.Mixed, required: true },
    published: { type: Schema.Types.Mixed, default: null },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    publishCount: { type: Number, default: 0 },
    version: { type: Number, required: true, min: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, minimize: false, versionKey: false },
);
pageSchema.index({ path: 1 }, { unique: true });

export const Page = model<PageFields>("Page", pageSchema, "pages");

/** Every published copy of a page; the newest 20 are kept for one-click restore. */
interface PageVersionFields {
  pageId: Types.ObjectId;
  number: number;
  content: PageContent;
  publishedAt: Date;
  publishedBy: Types.ObjectId | null;
}

const pageVersionSchema = new Schema<PageVersionFields>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    number: { type: Number, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { minimize: false, versionKey: false },
);
pageVersionSchema.index({ pageId: 1, number: -1 }, { unique: true });

export const PageVersion = model<PageVersionFields>("PageVersion", pageVersionSchema, "page_versions");

/** "Tell me when you reach my area", from visitors outside the service areas. */
interface AreaRequestFields {
  phone: string;
  place: string;
  location: { lat: number; lng: number } | null;
  ip: string | null;
  createdAt: Date;
}

const areaRequestSchema = new Schema<AreaRequestFields>(
  {
    phone: { type: String, required: true },
    place: { type: String, default: "" },
    location: { type: new Schema({ lat: Number, lng: Number }, { _id: false }), default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
// Kept for a year: long enough to plan the next areas, not forever (plan C5).
areaRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60, name: "area_requests_ttl" });

export const AreaRequest = model<AreaRequestFields>("AreaRequest", areaRequestSchema, "area_requests");
