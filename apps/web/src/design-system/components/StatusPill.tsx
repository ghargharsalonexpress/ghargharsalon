import type { ReactNode } from "react";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import { keyframes, useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

export type BadgeTone = "neutral" | "info" | "accent" | "accentSolid" | "success" | "warning" | "danger";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70% { box-shadow: 0 0 0 5px transparent; opacity: 0.85; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
`;

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Small live dot for ongoing processes (e.g. searching). */
  live?: boolean;
  icon?: ReactNode;
}

/** Text pill. Status is never shown by colour alone (plan B2). */
export function Badge({ tone = "neutral", children, live = false, icon }: BadgeProps) {
  const { tokens } = useTheme();
  const n = tokens.neutral;
  const a = tokens.accent;
  const s = tokens.semantic;

  const colours: Record<BadgeTone, { fg: string; bg: string }> = {
    neutral: { fg: n[700], bg: n[100] },
    info: { fg: s.info.fg, bg: s.info.bg },
    accent: { fg: a[700], bg: a[50] },
    accentSolid: { fg: n[0], bg: a[600] },
    success: { fg: s.success.fg, bg: s.success.bg },
    warning: { fg: s.warning.fg, bg: s.warning.bg },
    danger: { fg: s.danger.fg, bg: s.danger.bg },
  };
  const c = colours[tone];

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.5,
        height: 24,
        px: 2.5,
        borderRadius: `${tokens.radius.full}px`,
        bgcolor: c.bg,
        color: c.fg,
        typography: "caption",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {live && (
        <Box
          component="span"
          aria-hidden
          sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "currentColor", animation: `${pulse} 1.6s ease-out infinite` }}
        />
      )}
      {icon && (
        <Box component="span" aria-hidden sx={{ display: "inline-flex", fontSize: 14 }}>
          {icon}
        </Box>
      )}
      {children}
    </Box>
  );
}

export type BookingStatus =
  | "awaiting_payment"
  | "searching"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_professional_found"
  | "expired"
  | "refund_pending"
  | "refund_failed";

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  awaiting_payment: "neutral",
  searching: "info",
  accepted: "accent",
  arrived: "accent",
  in_progress: "accentSolid",
  completed: "success",
  cancelled: "neutral",
  no_professional_found: "warning",
  expired: "neutral",
  refund_pending: "warning",
  refund_failed: "danger",
};

/** Booking status map from plan B2, with translated labels. */
export function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return (
    <Badge
      tone={STATUS_TONE[status]}
      live={status === "searching"}
      icon={status === "refund_failed" ? <ErrorOutlineOutlined fontSize="inherit" /> : undefined}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
