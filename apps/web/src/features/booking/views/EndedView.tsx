import type { BookingDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert } from "@/design-system";
import { formatMoney, formatTime } from "@/lib/format";
import { AddressBlock, HelpLine, Panel, ReceiptLines, RefundStatus } from "../parts";

const KNOWN_REASONS = new Set(["changed_plans", "too_late", "booked_by_mistake", "other", "customer_unavailable"]);

/** Cancelled, no professional or expired (plan A8): what happened, and where the money is. */
export function EndedView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const cancellation = booking.cancellation;

  let title: string;
  let body: string;
  if (booking.status === "no_professional_found") {
    title = t("ended.noProTitle");
    body = t("ended.noProBody", { amount: formatMoney(booking.pricing.totalPaise, lang) });
  } else if (booking.status === "expired") {
    title = t("ended.expiredTitle");
    body = t("ended.expiredBody");
  } else {
    const at = cancellation ? formatTime(new Date(cancellation.at), lang) : "";
    const by = cancellation?.by ?? "system";
    title = t(`ended.cancelledBy.${by}`, { time: at });
    const reason = cancellation?.reason ?? "";
    body = KNOWN_REASONS.has(reason) ? t(`ended.reasons.${reason}`) : by === "admin" && reason ? t("ended.adminReason", { reason }) : t("ended.cancelledBody");
  }

  return (
    <Box sx={{ display: "grid", gap: 5, maxWidth: 720 }}>
      <InlineAlert tone={booking.status === "expired" ? "info" : "warning"} title={title}>
        {body}
      </InlineAlert>
      {booking.status !== "expired" && (
        <Panel id="refund-title" title={t("refund.title")}>
          <RefundStatus booking={booking} />
        </Panel>
      )}
      <Panel id="details-panel" title={t("booking.detailsTitle")}>
        <Box sx={{ display: "grid", gap: 5 }}>
          <AddressBlock booking={booking} />
          <ReceiptLines booking={booking} />
        </Box>
      </Panel>
      <Box sx={{ display: "grid", gap: 3, justifyItems: "start" }}>
        <Button to="/services">{t("ended.browse")}</Button>
        <HelpLine />
      </Box>
    </Box>
  );
}
