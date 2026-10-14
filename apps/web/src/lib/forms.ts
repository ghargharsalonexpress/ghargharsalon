import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";

/**
 * Puts the API's field errors on the matching inputs (focusing the first) and returns
 * the error to show above the form when it isn't only about fields.
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: ReadonlyArray<Path<T>>): unknown | null {
  if (!(error instanceof ApiError)) return error;

  let shown = 0;
  for (const [path, messageKey] of Object.entries(error.fields)) {
    if (!(fields as ReadonlyArray<string>).includes(path)) continue;
    setError(path as Path<T>, { type: "server", message: messageKey }, { shouldFocus: shown === 0 });
    shown++;
  }
  const onlyAboutFields = shown > 0 && (error.code === "VALIDATION_FAILED" || error.code === "EMAIL_TAKEN");
  return onlyAboutFields ? null : error;
}
