import { useEffect, useRef } from "react";
import type { BookingDto } from "@brand/shared";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button } from "@/design-system";
import { formatMoney } from "@/lib/format";
import { BookingTimeline, HelpLine, Panel, ProfessionalCard, ReceiptLines } from "../parts";
import { ReviewForm, ReviewSummary } from "../ReviewForm";
import { dateTimeText } from "../text";

/** Completed (plan W9): the receipt, the invoice and one request: rate the service. */
export function CompletedView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const [params] = useSearchParams();
  const reviewRef = useRef<HTMLDivElement>(null);
  const completed = booking.timeline.findLast((entry) => entry.status === "completed");
  const name = booking.professional?.name ?? "";

  // The completion email links here with ?rate=1: take people straight to the stars.
  const wantsRating = params.get("rate") === "1" && !booking.review;
  useEffect(() => {
    if (!wantsRating) return;
    reviewRef.current?.scrollIntoView({ block: "start" });
    reviewRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [wantsRating]);

  return (
    <Box sx={{ display: "grid", gap: 5, maxWidth: 720 }}>
      <Panel id="done-panel">
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>{t("completed.paid", { amount: formatMoney(booking.pricing.totalPaise, lang) })}</Typography>
          {completed && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("completed.at", { time: dateTimeText(completed.at, lang) })}
            </Typography>
          )}
        </Box>
      </Panel>

      <Box ref={reviewRef} sx={{ scrollMarginTop: 96 }}>
        <Panel id="review-title" title={booking.review ? t("review.doneTitle") : t("review.title")}>
          {booking.review ? <ReviewSummary rating={booking.review.rating} comment={booking.review.comment} /> : <ReviewForm bookingId={booking.id} professionalName={name} />}
        </Panel>
      </Box>

      <Panel id="receipt-title" title={t("completed.receiptTitle")}>
        <Box sx={{ display: "grid", gap: 5 }}>
          <ReceiptLines booking={booking} />
          {booking.invoiceNumber && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
              <Button variant="secondary" to={`/bookings/${booking.id}/invoice`} startIcon={<ReceiptLongOutlined />}>
                {t("completed.invoice")}
              </Button>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {booking.invoiceNumber}
              </Typography>
            </Box>
          )}
        </Box>
      </Panel>

      {booking.professional && (
        <Panel id="pro-panel" title={t("completed.proTitle")}>
          <ProfessionalCard professional={booking.professional} />
        </Panel>
      )}
      <Panel id="progress-panel" title={t("timeline.title")}>
        <BookingTimeline booking={booking} />
      </Panel>
      <Box sx={{ display: "grid", gap: 3, justifyItems: "start" }}>
        <Button variant="secondary" to="/services">
          {t("completed.bookAgain")}
        </Button>
        <HelpLine />
      </Box>
    </Box>
  );
}
