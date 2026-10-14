import { V, type z } from "@brand/shared";
import type { Request, RequestHandler } from "express";
import { AppError } from "../errors";

/** Field path → message key; the first problem per field wins (required before format). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const base = issue.path.map(String);
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) fields[[...base, key].join(".")] ??= V.unknownField;
      continue;
    }
    const path = base.join(".") || "_";
    fields[path] ??= issue.message.startsWith("validation.") ? issue.message : V.invalid;
  }
  return fields;
}

/**
 * Validates and replaces req.body with the parsed value. Schemas are strict, so unknown keys
 * (and with them NoSQL operators like {"$ne": ""}) are rejected before any query runs (plan C11).
 */
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) throw new AppError("VALIDATION_FAILED", { fields: fieldErrors(result.error) });
    req.body = result.data;
    next();
  };
}

/** Typed access to a body that `validateBody(schema)` already parsed. */
export const bodyOf = <S extends z.ZodType>(req: Request, _schema: S): z.output<S> => req.body as z.output<S>;
