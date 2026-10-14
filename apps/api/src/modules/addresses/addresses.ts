import { ADDRESS_LABELS, type AddressData, type AddressDto, addressInputSchema } from "@brand/shared";
import { Router } from "express";
import { model, Schema, type Types } from "mongoose";
import { AppError } from "../../errors";
import { currentUser, requireRole } from "../../http/auth";
import { objectIdParam } from "../../http/ids";
import { bodyOf, validateBody } from "../../http/validate";
import { type GeoJsonPoint, toPoint } from "../professionals/professional.model";

/** A customer can keep this many addresses; more is almost always duplicates. */
const MAX_ADDRESSES = 10;

interface AddressFields {
  userId: Types.ObjectId;
  label: (typeof ADDRESS_LABELS)[number];
  house: string;
  building: string;
  street: string;
  landmark: string;
  city: string;
  pincode: string;
  location: GeoJsonPoint;
  placeId: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema<GeoJsonPoint>({ type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } }, { _id: false });

const addressSchema = new Schema<AddressFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, enum: ADDRESS_LABELS, required: true },
    house: { type: String, required: true },
    building: { type: String, default: "" },
    street: { type: String, required: true },
    landmark: { type: String, default: "" },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    location: { type: pointSchema, required: true },
    placeId: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);
addressSchema.index({ userId: 1, createdAt: -1 });

export const Address = model<AddressFields>("Address", addressSchema, "addresses");

export function toAddressDto(doc: AddressFields & { _id: Types.ObjectId }): AddressDto {
  const [lng, lat] = doc.location.coordinates;
  return {
    id: String(doc._id),
    label: doc.label,
    house: doc.house,
    building: doc.building,
    street: doc.street,
    landmark: doc.landmark,
    city: doc.city,
    pincode: doc.pincode,
    location: { lat, lng },
    placeId: doc.placeId,
    isDefault: doc.isDefault,
  };
}

const fields = (input: AddressData) => ({ ...input, location: toPoint(input.location.lat, input.location.lng) });

/** The customer's own address, or 404 (never someone else's). */
export async function ownAddress(userId: Types.ObjectId | string, addressId: string) {
  const doc = await Address.findOne({ _id: addressId, userId }).lean();
  if (!doc) throw new AppError("NOT_FOUND");
  return doc;
}

/** /v1/me/addresses (plan W3): saved places for checkout. One default at a time. */
export function addressesRouter(): Router {
  const router = Router();
  router.use(requireRole("customer"));

  router.get("/", async (req, res) => {
    const docs = await Address.find({ userId: currentUser(req)._id }).sort({ isDefault: -1, updatedAt: -1 }).lean();
    res.json(docs.map(toAddressDto));
  });

  router.post("/", validateBody(addressInputSchema), async (req, res) => {
    const userId = currentUser(req)._id;
    const input = bodyOf(req, addressInputSchema);
    if ((await Address.countDocuments({ userId })) >= MAX_ADDRESSES) throw new AppError("VALIDATION_FAILED", { fields: { _: "validation.tooManyAddresses" }, detail: "address limit" });
    const first = (await Address.countDocuments({ userId })) === 0;
    if (input.isDefault || first) await Address.updateMany({ userId }, { $set: { isDefault: false } });
    const doc = await Address.create({ ...fields(input), isDefault: input.isDefault || first, userId });
    res.status(201).json(toAddressDto(doc.toObject()));
  });

  router.put("/:id", validateBody(addressInputSchema), async (req, res) => {
    const userId = currentUser(req)._id;
    const id = objectIdParam(req.params.id);
    const input = bodyOf(req, addressInputSchema);
    await ownAddress(userId, id);
    if (input.isDefault) await Address.updateMany({ userId, _id: { $ne: id } }, { $set: { isDefault: false } });
    const doc = await Address.findOneAndUpdate({ _id: id, userId }, { $set: fields(input) }, { returnDocument: "after" }).lean();
    if (!doc) throw new AppError("NOT_FOUND");
    res.json(toAddressDto(doc));
  });

  router.delete("/:id", async (req, res) => {
    const userId = currentUser(req)._id;
    const id = objectIdParam(req.params.id);
    const doc = await ownAddress(userId, id);
    await Address.deleteOne({ _id: id, userId });
    // Keep one default while any address remains.
    if (doc.isDefault) {
      const next = await Address.findOne({ userId }).sort({ updatedAt: -1 });
      if (next) await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
    }
    res.status(204).end();
  });

  return router;
}
