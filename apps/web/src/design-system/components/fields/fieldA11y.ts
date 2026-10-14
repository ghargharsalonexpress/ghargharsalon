import type { ReactNode } from "react";

export const fieldIds = (id: string) => ({ label: `${id}-label`, hint: `${id}-hint`, error: `${id}-error` });

/** ids for aria-describedby: the error replaces the hint while present. */
export function describedBy(id: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  const ids = fieldIds(id);
  if (error) return ids.error;
  if (hint) return ids.hint;
  return undefined;
}
