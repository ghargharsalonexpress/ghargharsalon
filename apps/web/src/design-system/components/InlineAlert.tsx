import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import type { Tone } from "../tokens/color";
import { toneIcons } from "./toneIcons";

const SEVERITY = { success: "success", warning: "warning", danger: "error", info: "info" } as const;

export interface InlineAlertProps {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
  /** A single action (e.g. a "Try again" button). */
  action?: ReactNode;
}

/** Contextual message inside a page or form. Danger alerts are announced immediately. */
export function InlineAlert({ tone = "info", title, children, action }: InlineAlertProps) {
  return (
    <Alert
      severity={SEVERITY[tone]}
      iconMapping={toneIcons}
      action={action}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  );
}
