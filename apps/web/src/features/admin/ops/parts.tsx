import type { ReactNode } from "react";
import type { AdminAlertDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeTone, Button, Link } from "@/design-system";
import { when } from "./format";

/** A bordered admin section with its own heading (h2). */
export function Section({ id, title, actions, children, flush = false }: { id: string; title: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Box component="section" aria-labelledby={id} sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: flush ? 0 : { xs: 4, md: 6 }, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, flexWrap: "wrap", mb: 4, ...(flush ? { px: { xs: 4, md: 6 }, pt: { xs: 4, md: 6 } } : {}) }}>
        <Typography id={id} variant="h2" sx={{ typography: "h3" }}>
          {title}
        </Typography>
        {actions && <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{actions}</Box>}
      </Box>
      {children}
    </Box>
  );
}

/** One label and value in a <dl>. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, mt: 0.5, overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </Box>
  );
}

/** A number that matters today; never colour alone (plan B2). */
export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: BadgeTone }) {
  const { tokens } = useTheme();
  return (
    <Box sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: 5, minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="numericXl" component="p" sx={{ m: 0, mt: 1 }}>
        {value}
      </Typography>
      {hint && (
        <Box sx={{ mt: 1 }}>
          {tone ? (
            <Badge tone={tone}>{hint}</Badge>
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {hint}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

const ALERT_TONE: Record<AdminAlertDto["kind"], BadgeTone> = {
  no_match: "warning",
  refund_failed: "danger",
  late: "warning",
  otp_locked: "danger",
  pro_cancelled: "info",
  slow_search: "info",
};

/** Alerts with a link to the booking and "Resolve" (plan Phase 8: deep links). */
export function AlertList({ alerts, onResolve, resolvingId }: { alerts: AdminAlertDto[]; onResolve?: (alert: AdminAlertDto) => void; resolvingId?: string | null }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {alerts.map((alert) => (
        <Box
          component="li"
          key={alert.id}
          sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center", py: 3, borderTop: `1px solid ${tokens.neutral[200]}`, "&:first-of-type": { borderTop: 0, pt: 0 } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <Badge tone={ALERT_TONE[alert.kind]}>{t(`alerts.kinds.${alert.kind}`)}</Badge>
              {alert.bookingId && alert.bookingNumber && <Link to={`/admin/bookings/${alert.bookingId}`}>{alert.bookingNumber}</Link>}
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {when(alert.createdAt)}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {alert.message}
            </Typography>
          </Box>
          {onResolve && !alert.resolvedAt ? (
            <Button variant="secondary" size="sm" loading={resolvingId === alert.id} onClick={() => onResolve(alert)}>
              {t("alerts.resolve")}
            </Button>
          ) : alert.resolvedAt ? (
            <Badge tone="success">{t("alerts.resolved")}</Badge>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
