import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, Button, EmptyState, InlineAlert } from "@/design-system";
import { dateTimeText } from "@/features/booking/text";
import { errorText } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { proEarningsQuery } from "./api";

/**
 * Earnings (plan A7 /pro/earnings): today, this week and what's still to be paid out, then each
 * job with the service amount, the platform's share and what they keep (plan A4: payouts by bank transfer).
 */
export function ProEarningsPage() {
  const { t, i18n } = useTranslation("pro");
  const lang = i18n.language;
  const { tokens } = useTheme();
  const earnings = useQuery(proEarningsQuery);
  const card = { bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: 5 } as const;
  const data = earnings.data;

  if (earnings.isError) {
    return (
      <InlineAlert
        tone="danger"
        action={
          <Button variant="tertiary" size="sm" onClick={() => void earnings.refetch()}>
            {t("common:action.retry")}
          </Button>
        }
      >
        {errorText(t, earnings.error)}
      </InlineAlert>
    );
  }

  const totals = [
    { key: "today", paise: data?.todayPaise },
    { key: "week", paise: data?.weekPaise },
  ] as const;

  return (
    <Box sx={{ display: "grid", gap: 4 }}>
      <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr" }}>
        {totals.map((total) => (
          <Box key={total.key} sx={card}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t(`earnings.${total.key}`)}
            </Typography>
            {total.paise === undefined ? (
              <Skeleton variant="text" height={40} width="70%" />
            ) : (
              <Typography variant="numericXl" component="p" sx={{ m: 0, mt: 1 }}>
                {formatMoney(total.paise, lang)}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      {data && data.pendingPayoutPaise > 0 && (
        <InlineAlert tone="info" title={t("earnings.pendingTitle", { amount: formatMoney(data.pendingPayoutPaise, lang) })}>
          {t("earnings.pendingBody")}
        </InlineAlert>
      )}
      <Box sx={{ ...card, p: 0 }}>
        {!data ? (
          <Box aria-busy sx={{ display: "grid", gap: 3, p: 4 }}>
            <Skeleton variant="rounded" height={72} />
            <Skeleton variant="rounded" height={72} />
          </Box>
        ) : data.jobs.length === 0 ? (
          <EmptyState headingLevel="h2" icon={<AccountBalanceWalletOutlined />} title={t("earnings.emptyTitle")} description={t("earnings.emptyBody")} />
        ) : (
          <Box component="section" aria-labelledby="earnings-jobs">
            <Typography id="earnings-jobs" variant="h3" component="h2" sx={{ px: 5, pt: 5, pb: 2 }}>
              {t("earnings.jobsTitle")}
            </Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {data.jobs.map((job) => (
                <Box component="li" key={job.id} sx={{ px: 5, py: 4, borderTop: `1px solid ${tokens.neutral[200]}`, display: "grid", gap: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{job.number}</Typography>
                    <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tokens.semantic.success.fg }}>{formatMoney(job.netPaise, lang)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {dateTimeText(job.completedAt, lang)}
                    </Typography>
                    <Badge tone={job.payoutStatus === "paid" ? "success" : "neutral"}>{t(`earnings.payout.${job.payoutStatus}`)}</Badge>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {t("earnings.breakdown", { gross: formatMoney(job.grossPaise, lang), commission: formatMoney(job.commissionPaise, lang) })}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
