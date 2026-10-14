import type { ReactNode } from "react";

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: ReactNode;
  /** Shows a count badge (e.g. alerts). */
  badge?: number;
}
