import type { ReactNode } from "react";

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: ReactNode;
  /** Shows a count badge (e.g. alerts). */
  badge?: number;
  /** Outlined instead of plain: a link for a different audience, e.g. professionals. */
  emphasis?: boolean;
}
