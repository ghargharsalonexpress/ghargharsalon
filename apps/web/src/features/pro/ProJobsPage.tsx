import { type ReactNode, useState } from "react";
import type { ProJobSummaryDto } from "@brand/shared";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import WorkOutlineOutlined from "@mui/icons-material/WorkOutlineOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Button, EmptyState, InlineAlert, StatusPill, TabPanel, Tabs } from "@/design-system";
import { dateTimeText } from "@/features/booking/text";
import { errorText } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { proJobsQuery } from "./api";

type View = "current" | "past";

/** My jobs (plan A7 /pro/jobs): the job in hand first, then history with what each one earned. */
export function ProJobsPage() {
  const { t } = useTranslation("pro");
  const { tokens } = useTheme();
  const [view, setView] = useState<View>("current");
  const jobs = useQuery(proJobsQuery);
  const current = jobs.data?.current ?? [];
  const past = jobs.data?.past ?? [];

  const panel = (list: ProJobSummaryDto[], empty: ReactNode) =>
    jobs.isPending ? (
      <Box aria-busy sx={{ display: "grid", gap: 3, p: 4 }}>
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={72} />
      </Box>
    ) : jobs.isError ? (
      <Box sx={{ p: 4 }}>
        <InlineAlert
          tone="danger"
          action={
            <Button variant="tertiary" size="sm" onClick={() => void jobs.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {errorText(t, jobs.error)}
        </InlineAlert>
      </Box>
    ) : list.length === 0 ? (
      empty
    ) : (
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {list.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </Box>
    );

  return (
    <Box sx={{ display: "grid", gap: 4 }}>
      <Tabs<View>
        idPrefix="pro-jobs"
        label={t("jobs.title")}
        value={view}
        onChange={setView}
        items={[
          { value: "current", label: t("jobs.current"), count: current.length || undefined },
          { value: "past", label: t("jobs.past") },
        ]}
      />
      <Box sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, overflow: "hidden" }}>
        <TabPanel idPrefix="pro-jobs" value="current" current={view}>
          {panel(
            current,
            <EmptyState
              headingLevel="h2"
              icon={<WorkOutlineOutlined />}
              title={t("jobs.emptyCurrentTitle")}
              description={t("jobs.emptyCurrentBody")}
              action={
                <Button variant="secondary" to="/pro">
                  {t("jobs.goHome")}
                </Button>
              }
            />,
          )}
        </TabPanel>
        <TabPanel idPrefix="pro-jobs" value="past" current={view}>
          {panel(past, <EmptyState headingLevel="h2" icon={<WorkOutlineOutlined />} title={t("jobs.emptyPastTitle")} description={t("jobs.emptyPastBody")} />)}
        </TabPanel>
      </Box>
    </Box>
  );
}

function JobRow({ job }: { job: ProJobSummaryDto }) {
  const { t, i18n } = useTranslation("pro");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const when = job.completedAt ?? job.acceptedAt;

  return (
    <Box component="li" sx={{ borderBottom: `1px solid ${tokens.neutral[200]}`, "&:last-of-type": { borderBottom: 0 } }}>
      <Box
        component={RouterLink}
        to={`/pro/jobs/${job.id}`}
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          gap: 3,
          p: 4,
          minHeight: 72,
          color: "text.primary",
          textDecoration: "none",
          "&:hover": { bgcolor: tokens.neutral[50] },
          "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: -2 },
        }}
      >
        <Box sx={{ minWidth: 0, display: "grid", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {job.locality || job.number}
            </Typography>
            <StatusPill status={job.status} />
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {[job.number, when ? dateTimeText(when, lang) : null].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }} aria-label={t("jobs.earned", { amount: formatMoney(job.earningsPaise, lang) })}>
            {formatMoney(job.earningsPaise, lang)}
          </Typography>
          <ChevronRightOutlined aria-hidden sx={{ color: tokens.neutral[600] }} />
        </Box>
      </Box>
    </Box>
  );
}
