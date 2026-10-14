import { useState } from "react";
import type { BookingDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, InlineAlert } from "@/design-system";
import { useCart } from "@/features/cart/cartStore";
import { errorText } from "@/lib/errors";
import { formatMoney, formatTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { bookingQuery, retryPayment } from "../api";
import { AddressBlock, HelpLine, Panel, ReceiptLines } from "../parts";
import { usePaymentSheet } from "../payment";

/**
 * Not paid yet (plan A8): the booking is held until it expires; paying again uses the same
 * booking, never a new one. Nothing is charged if it expires.
 */
export function AwaitingPaymentView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const queryClient = useQueryClient();
  const payment = usePaymentSheet();
  const settleCart = useCart((state) => state.settle);
  const now = useNow(5_000);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<"dismissed" | "failed" | null>(null);

  const expiresAt = booking.paymentExpiresAt ? Date.parse(booking.paymentExpiresAt) : null;
  const expired = expiresAt !== null && now >= expiresAt;
  const amount = formatMoney(booking.pricing.totalPaise, lang);

  const pay = async () => {
    setError(null);
    setNotice(null);
    setPaying(true);
    try {
      const order = await retryPayment(booking.id);
      const outcome = await payment.pay({ id: booking.id, number: booking.number }, order);
      if (outcome.status === "paid") {
        queryClient.setQueryData(bookingQuery(booking.id).queryKey, outcome.booking);
        settleCart(booking.id);
      } else setNotice(outcome.status);
    } catch (failure) {
      setError(failure);
      void queryClient.invalidateQueries({ queryKey: bookingQuery(booking.id).queryKey });
    } finally {
      setPaying(false);
    }
  };

  const payButton = (
    <Button size="lg" onClick={() => void pay()} loading={paying} disabled={expired}>
      {t("checkout.pay", { amount })}
    </Button>
  );

  return (
    <>
      <Box sx={{ display: "grid", gap: 5, maxWidth: 720 }}>
        <InlineAlert tone="warning" title={t("awaiting.title")}>
          {expired ? t("awaiting.expiring") : expiresAt ? t("awaiting.body", { time: formatTime(new Date(expiresAt), lang) }) : t("awaiting.bodyNoTime")}
        </InlineAlert>
        {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}
        {notice === "dismissed" && <InlineAlert tone="warning">{t("checkout.notCompleted")}</InlineAlert>}
        {notice === "failed" && <InlineAlert tone="danger">{t("checkout.failed")}</InlineAlert>}
        <Panel id="details-panel" title={t("booking.detailsTitle")}>
          <Box sx={{ display: "grid", gap: 5 }}>
            <AddressBlock booking={booking} />
            <ReceiptLines booking={booking} />
          </Box>
        </Panel>
        <Box sx={{ display: { xs: "none", md: "block" } }}>{payButton}</Box>
        <HelpLine />
      </Box>
      <ActionBar>
        <Box sx={{ flex: 1 }} />
        {payButton}
      </ActionBar>
      {payment.sheet}
    </>
  );
}
