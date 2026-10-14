import type { BookingDto } from "@brand/shared";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { durationText } from "@/lib/duration";
import { formatTime } from "@/lib/format";
import { clockDuration, useNow } from "@/lib/useNow";
import { AddressBlock, BookingTimeline, HelpLine, Panel, ProfessionalCard, ReceiptLines } from "../parts";

/** Service in progress (plan A8): a running timer against the expected time. */
export function InProgressView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const now = useNow(1000);
  const started = booking.timeline.findLast((entry) => entry.status === "in_progress");
  const startedAt = started ? Date.parse(started.at) : now;
  const expected = booking.items.reduce((sum, item) => sum + item.durationMin * item.quantity, 0);

  return (
    <Box sx={{ display: "grid", gap: 5, maxWidth: 720 }}>
      <Panel id="timer-panel">
        <Box sx={{ display: "grid", gap: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("inProgress.startedAt", { time: formatTime(new Date(startedAt), lang) })}
          </Typography>
          <Typography variant="numericXl" component="p" role="timer" aria-label={t("inProgress.timerLabel")} sx={{ m: 0 }}>
            {clockDuration(now - startedAt)}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("inProgress.expected", { duration: durationText(t, expected) })}
          </Typography>
        </Box>
      </Panel>
      {booking.professional && (
        <Panel id="pro-panel" title={t("tracking.proTitle")}>
          <ProfessionalCard professional={booking.professional} />
        </Panel>
      )}
      <Panel id="progress-panel" title={t("timeline.title")}>
        <BookingTimeline booking={booking} />
      </Panel>
      <Panel id="details-panel" title={t("booking.detailsTitle")}>
        <Box sx={{ display: "grid", gap: 5 }}>
          <AddressBlock booking={booking} />
          <ReceiptLines booking={booking} />
        </Box>
      </Panel>
      <HelpLine />
    </Box>
  );
}
