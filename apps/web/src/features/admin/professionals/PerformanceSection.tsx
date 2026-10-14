import { useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, ConfirmDialog, InlineAlert, Link, StatusPill, useToast } from "@/design-system";
import { performanceQuery, useMarkPayout } from "@/features/admin/ops/api";
import { rupees, when } from "@/features/admin/ops/format";
import { Field } from "@/features/admin/ops/parts";
import { errorText } from "@/lib/errors";

/**
 * Performance and payouts (plan W15, A4): accept rate, completed jobs and rating, and what's
 * still owed. Payouts happen by bank transfer outside the platform; this marks them done.
 */
export function PerformanceSection({ professionalId, name }: { professionalId: string; name: string }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const performance = useQuery(performanceQuery(professionalId));
  const payout = useMarkPayout(professionalId);
  const [confirming, setConfirming] = useState(false);
  const p = performance.data;

  return (
    <Box component="section" aria-labelledby="performance-title" sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 4, md: 6 }, gridColumn: { lg: "1 / -1" } }}>
      <Typography id="performance-title" variant="h2" sx={{ typography: "h3", mb: 4 }}>
        {t("performance.title")}
      </Typography>
      {performance.isError ? (
        <InlineAlert tone="danger">{errorText(t, performance.error)}</InlineAlert>
      ) : !p ? (
        <Skeleton variant="rounded" height={140} />
      ) : (
        <Box sx={{ display: "grid", gap: 6 }}>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 4, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
            <Field label={t("performance.completed")}>{p.completed}</Field>
            <Field label={t("performance.acceptRate")}>{p.acceptRate === null ? "—" : `${Math.round(p.acceptRate * 100)}% (${p.accepted}/${p.offers})`}</Field>
            <Field label={t("performance.rating")}>{p.rating === null ? t("performance.noRating") : t("performance.ratingValue", { rating: p.rating, count: p.ratingCount })}</Field>
            <Field label={t("performance.cancellations")}>
              {p.cancelledByPro}
              {p.cancelledByPro >= 3 && (
                <Box component="span" sx={{ ml: 2 }}>
                  <Badge tone="warning">{t("performance.flagged")}</Badge>
                </Box>
              )}
            </Field>
            <Field label={t("performance.pending")}>{rupees(p.pendingPayoutPaise)}</Field>
            <Field label={t("performance.paidOut")}>{rupees(p.paidOutPaise)}</Field>
          </Box>
          {payout.isError && <InlineAlert tone="danger">{errorText(t, payout.error)}</InlineAlert>}
          <Box>
            <Button variant="secondary" disabled={p.pendingPayoutPaise === 0} onClick={() => setConfirming(true)}>
              {t("performance.markPaid")}
            </Button>
          </Box>
          {p.recentJobs.length > 0 && (
            <Box>
              <Typography variant="h3" component="h3" sx={{ typography: "label", mb: 2 }}>
                {t("performance.recent")}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {p.recentJobs.map((job, index) => (
                  <Box
                    component="li"
                    key={job.id}
                    sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center", py: 2, borderTop: index === 0 ? 0 : `1px solid ${tokens.neutral[100]}` }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Link to={`/admin/bookings/${job.id}`}>{job.number}</Link>
                      <Typography variant="body2" component="span" sx={{ ml: 2, color: "text.secondary" }}>
                        {[job.completedAt ? when(job.completedAt) : null, job.netPaise ? rupees(job.netPaise) : null, job.payoutStatus ? t(`performance.payout.${job.payoutStatus}`) : null].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <StatusPill status={job.status} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          payout.mutate(undefined, {
            onSuccess: (result) => {
              toast(t("performance.paidToast", { amount: rupees(result.paidPaise), count: result.jobs }));
              setConfirming(false);
            },
          })
        }
        tone="primary"
        loading={payout.isPending}
        title={t("performance.markPaidTitle", { name })}
        consequence={t("performance.markPaidBody", { amount: rupees(p?.pendingPayoutPaise ?? 0) })}
        confirmLabel={t("performance.markPaid")}
      />
    </Box>
  );
}
