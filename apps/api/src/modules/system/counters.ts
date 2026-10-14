import type { ClientSession } from "mongoose";
import { model, Schema } from "mongoose";

interface CounterFields {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterFields>({ _id: { type: String, required: true }, seq: { type: Number, required: true } }, { versionKey: false });
export const Counter = model<CounterFields>("Counter", counterSchema, "counters");

/** Atomic sequence starting at 1 (plan C5 counters): booking numbers, invoice series per financial year. */
export async function nextSequence(name: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session }).lean();
  if (!doc) throw new Error(`counter ${name} returned nothing`);
  return doc.seq;
}
