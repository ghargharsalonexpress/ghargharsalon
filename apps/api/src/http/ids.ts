import { AppError } from "../errors";

/** A MongoDB ObjectId from a path parameter, or 404 (never a CastError 500). */
export function objectIdParam(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/.test(value)) throw new AppError("NOT_FOUND");
  return value;
}
