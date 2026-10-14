import { useState } from "react";
import type { BookingDto } from "@brand/shared";
import Box from "@mui/material/Box";
import { keyframes, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert } from "@/design-system";
import { formatMoney } from "@/lib/format";
import { clockDuration, useNow } from "@/lib/useNow";
import { CancelBookingDialog } from "../CancelBookingDialog";
import { AddressBlock, HelpLine, Panel, ReceiptLines } from "../parts";

const ripple = keyframes`
  0% { transform: scale(0.35); opacity: 0.55; }
  100% { transform: scale(1); opacity: 0; }
`;

/** The calm "finding" indicator (plan B7 item 5). With reduced motion it is a still ring and the text carries it. */
function Radar() {
  const { tokens } = useTheme();
  const size = 168;
  return (
    <Box aria-hidden sx={{ position: "relative", width: size, height: size, mx: "auto" }}>
      {[0, 1, 2].map((ring) => (
        <Box
          key={ring}
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${tokens.accent[600]}`,
            opacity: 0,
            animation: `${ripple} 2.4s cubic-bezier(.2,0,0,1) ${ring * 0.8}s infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: ring === 0 ? 0.25 : 0, transform: "scale(0.8)" },
          }}
        />
      ))}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 20,
          height: 20,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          bgcolor: tokens.accent[600],
          boxShadow: `0 0 0 6px ${tokens.accent[100]}`,
        }}
      />
    </Box>
  );
}

/**
 * Searching (plan Phase 6 UX): what is happening, how long it usually takes and what happens
 * if nobody is free (a full refund, automatically). Cancelling is free here.
 */
export function SearchingView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const now = useNow(1000);
  const [cancelling, setCancelling] = useState(false);

  const startedAt = booking.search ? Date.parse(booking.search.startedAt) : Date.parse(booking.createdAt);
  const deadline = booking.search ? Date.parse(booking.search.deadlineAt) : null;
  const windowMinutes = deadline ? Math.max(1, Math.round((deadline - startedAt) / 60_000)) : 2;
  const overdue = deadline !== null && now > deadline + 5_000;

  return (
    <Box sx={{ display: "grid", gap: 6, maxWidth: 720 }}>
      <Panel id="finding-title">
        <Box sx={{ display: "grid", gap: 5, justifyItems: "center", textAlign: "center", py: { xs: 2, md: 4 } }}>
          <Radar />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{t("searching.contacting")}</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {t("searching.elapsed", { time: clockDuration(now - startedAt) })}
            </Typography>
          </Box>
          <Typography sx={{ maxWidth: 480 }}>
            {overdue ? t("searching.finishing") : t("searching.promise", { count: windowMinutes, amount: formatMoney(booking.pricing.totalPaise, lang) })}
          </Typography>
        </Box>
      </Panel>

      <InlineAlert tone="success">{t("searching.paid", { amount: formatMoney(booking.pricing.totalPaise, lang) })}</InlineAlert>

      <Panel id="searching-details" title={t("booking.detailsTitle")}>
        <Box sx={{ display: "grid", gap: 5 }}>
          <AddressBlock booking={booking} />
          <ReceiptLines booking={booking} />
        </Box>
      </Panel>

      <Box sx={{ display: "grid", gap: 3, justifyItems: "start" }}>
        <Button variant="secondary" onClick={() => setCancelling(true)}>
          {t("cancel.open")}
        </Button>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("searching.cancelFree")}
        </Typography>
        <HelpLine />
      </Box>

      {cancelling && <CancelBookingDialog bookingId={booking.id} professionalName={null} onClose={() => setCancelling(false)} />}
    </Box>
  );
}
