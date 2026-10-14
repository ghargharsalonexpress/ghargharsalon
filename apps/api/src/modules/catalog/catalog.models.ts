import { CATALOG_GENDERS, type CategoryInput, type ServiceInput, SKILLS } from "@brand/shared";
import { type HydratedDocument, model, Schema } from "mongoose";

const localized = { en: { type: String, default: "" }, hi: { type: String, default: "" } };
const localizedSchema = new Schema(localized, { _id: false });

const imageSchema = new Schema(
  { key: { type: String, required: true }, width: { type: Number, required: true }, height: { type: Number, required: true }, widths: { type: [Number], required: true } },
  { _id: false },
);

export interface CategoryFields extends CategoryInput {
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryFields>(
  {
    slug: { type: String, required: true },
    gender: { type: String, enum: CATALOG_GENDERS, required: true },
    name: { type: localizedSchema, required: true },
    description: { type: localizedSchema, default: () => ({ en: "", hi: "" }) },
    filters: { type: [new Schema({ slug: { type: String, required: true }, name: { type: localizedSchema, required: true } }, { _id: false })], default: [] },
    skill: { type: String, enum: SKILLS, required: true },
    image: { type: imageSchema, default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false },
);
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ gender: 1, order: 1 });

export const Category = model<CategoryFields>("Category", categorySchema, "categories");
export type CategoryDoc = HydratedDocument<CategoryFields>;

export interface ServiceFields extends ServiceInput {
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const tierSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: localizedSchema, required: true },
    pricePaise: { type: Number, required: true },
    compareAtPaise: { type: Number, default: null },
    durationMin: { type: Number, required: true },
    sessions: { type: Number, default: 1 },
  },
  { _id: false },
);

const serviceSchema = new Schema<ServiceFields>(
  {
    slug: { type: String, required: true },
    gender: { type: String, enum: CATALOG_GENDERS, required: true },
    categorySlugs: { type: [String], required: true },
    filterSlugs: { type: [String], default: [] },
    name: { type: localizedSchema, required: true },
    summary: { type: localizedSchema, default: () => ({ en: "", hi: "" }) },
    overview: { type: [new Schema({ title: localizedSchema, desc: localizedSchema }, { _id: false })], default: [] },
    thingsToKnow: { type: [localizedSchema], default: [] },
    aftercare: { type: [localizedSchema], default: [] },
    recommendedFor: { type: [localizedSchema], default: [] },
    products: { type: [localizedSchema], default: [] },
    faq: { type: [new Schema({ question: localizedSchema, answer: localizedSchema }, { _id: false })], default: [] },
    tiers: { type: [tierSchema], required: true },
    requiredSkills: { type: [String], enum: SKILLS, required: true },
    images: { type: [imageSchema], default: [] },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // Optimistic concurrency for the admin editor (plan W13: version conflict dialog).
    version: { type: Number, default: 1 },
  },
  { timestamps: true, minimize: false, versionKey: false },
);
serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ categorySlugs: 1, active: 1, order: 1 });

export const Service = model<ServiceFields>("Service", serviceSchema, "services");
export type ServiceDoc = HydratedDocument<ServiceFields>;
