import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, InlineAlert, PageHeader, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { dashboardQuery, useResolveAlert } from "./ops/api";
import { clock, rupees } from "./ops/format";
import { AlertList, Kpi, Section } from "./ops/parts";

/**
 * The dashboard (plan Phase 8): what's happening now, today's numbers and the alerts that
 * need someone, each linking to its booking. Refreshes every 15 seconds.
 */
export function AdminHomePage() {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const dashboard = useQuery(dashboardQuery);
  const resolve = useResolveAlert();
  usePageMeta(t("home.title"));

  const d = dashboard.data;
  const grid = { display: "grid", gap: 4, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } } as const;
  const rate = d?.today.noMatchRate;

  return (
    <>
      <PageHeader
        title={t("home.title")}
        description={dashboard.dataUpdatedAt ? t("dashboard.updated", { time: clock(new Date(dashboard.dataUpdatedAt).toISOString()) }) : undefined}
        actions={
          <Button variant="secondary" to="/admin/live">
            {t("dashboard.openLive")}
          </Button>
        }
      />
      {dashboard.isError && !d ? (
        <InlineAlert
          tone="danger"
          action={
            <Button variant="tertiary" size="sm" onClick={() => void dashboard.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {errorText(t, dashboard.error)}
        </InlineAlert>
      ) : !d ? (
        <Box aria-busy sx={{ display: "grid", gap: 4 }}>
          <Box sx={grid}>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} variant="rounded" height={112} />
            ))}
          </Box>
          <Skeleton variant="rounded" height={240} />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 8 }}>
          <Box component="section" aria-labelledby="now-title">
            <Typography id="now-title" variant="h2" sx={{ typography: "h3", mb: 3 }}>
              {t("dashboard.now")}
            </Typography>
            <Box sx={grid}>
              <Kpi label={t("dashboard.searching")} value={d.now.searching} hint={d.now.searching > 0 ? t("dashboard.searchingHint") : undefined} tone={d.now.searching > 0 ? "info" : undefined} />
              <Kpi label={t("dashboard.live")} value={d.now.live} />
              <Kpi label={t("dashboard.online")} value={d.now.onlineProfessionals} hint={t("dashboard.busy", { count: d.now.busyProfessionals })} />
              <Kpi label={t("dashboard.alertsOpen")} value={d.alerts.length} hint={d.alerts.length > 0 ? t("dashboard.needsAttention") : undefined} tone={d.alerts.length > 0 ? "warning" : undefined} />
            </Box>
          </Box>

          <Box component="section" aria-labelledby="today-title">
            <Typography id="today-title" variant="h2" sx={{ typography: "h3", mb: 3 }}>
              {t("dashboard.today")}
            </Typography>
            <Box sx={grid}>
              <Kpi label={t("dashboard.bookings")} value={d.today.bookings} hint={t("dashboard.paid", { count: d.today.paid })} />
              <Kpi label={t("dashboard.revenue")} value={rupees(d.today.revenuePaise)} hint={t("dashboard.revenueHint")} />
              <Kpi label={t("dashboard.completed")} value={d.today.completed} hint={t("dashboard.cancelled", { count: d.today.cancelled })} />
              <Kpi
                label={t("dashboard.noMatch")}
                value={rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`}
                hint={t("dashboard.noMatchCount", { count: d.today.noMatch })}
                tone={rate !== null && rate !== undefined && rate > 0.1 ? "warning" : undefined}
              />
              <Kpi label={t("dashboard.medianAccept")} value={d.today.medianAcceptSeconds === null ? "—" : t("dashboard.seconds", { count: d.today.medianAcceptSeconds })} hint={t("dashboard.medianAcceptHint")} />
            </Box>
          </Box>

          <Section
            id="alerts-title"
            title={t("dashboard.alertsTitle")}
            actions={
              <Button variant="tertiary" size="sm" to="/admin/bookings?view=attention">
                {t("dashboard.allAttention")}
              </Button>
            }
          >
            {d.alerts.length === 0 ? (
              <EmptyState headingLevel="h3" icon={<NotificationsNoneOutlined />} title={t("dashboard.noAlertsTitle")} description={t("dashboard.noAlertsBody")} />
            ) : (
              <AlertList
                alerts={d.alerts}
                resolvingId={resolve.isPending ? resolve.variables : null}
                onResolve={(alert) => resolve.mutate(alert.id, { onSuccess: () => toast(t("alerts.resolvedToast")) })}
              />
            )}
          </Section>
        </Box>
      )}
    </>
  );
}
