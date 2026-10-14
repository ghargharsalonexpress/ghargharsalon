import { useState } from "react";
import type { BookingDto } from "@brand/shared";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert, Link, OtpDisplay } from "@/design-system";
import { LiveMap } from "@/features/maps/LiveMap";
import { useInfo } from "@/features/public/info";
import { formatRelativeFromNow, formatTime } from "@/lib/format";
import { MAPS_KEY, placeUrl } from "@/lib/maps";
import { useNow } from "@/lib/useNow";
import { CancelBookingDialog } from "../CancelBookingDialog";
import { AddressBlock, BookingTimeline, HelpLine, Panel, ProfessionalCard, ReceiptLines } from "../parts";
import { addressLine } from "../text";

/** After this long without an update, the location is shown as paused (plan Phase 7 stale state). */
const STALE_MS = 2 * 60_000;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * Accepted and arrived (plan Phase 7, W7/W8): who is coming, how far, the live map when a key
 * is configured, and the start code. Once the professional arrives the code comes first.
 */
export function TrackingView({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const info = useInfo();
  const now = useNow(5_000);
  const [cancelling, setCancelling] = useState(false);
  const arrived = booking.status === "arrived";
  const pro = booking.professional;
  const name = pro ? firstName(pro.name) : t("cancel.yourProfessional");

  const tracking = booking.tracking;
  const updated = tracking ? formatRelativeFromNow(new Date(tracking.at), lang, new Date(now)) : null;
  const stale = tracking !== null && now - Date.parse(tracking.at) > STALE_MS;

  const eta = booking.eta;
  const acceptedEntry = booking.timeline.findLast((entry) => entry.status === "accepted");
  const late = !arrived && eta !== null && acceptedEntry !== undefined && now > Date.parse(acceptedEntry.at) + (eta.maxMinutes + info.lateThresholdMinutes) * 60_000;
  let etaText: string | null = null;
  let byText: string | null = null;
  if (!arrived && eta) {
    const elapsed = (now - Date.parse(eta.at)) / 60_000;
    const max = Math.round(eta.maxMinutes - elapsed);
    const min = Math.max(1, Math.min(Math.round(eta.minMinutes - elapsed), max - 1));
    etaText = max >= 2 ? t("common:duration.range", { min, max }) : null;
    byText = formatTime(new Date(Date.parse(eta.at) + eta.maxMinutes * 60_000), lang);
  }

  // The code is its own card; once the professional is at the door its hint says what to do now.
  const otpPanel = booking.otp ? <OtpDisplay code={booking.otp} hint={arrived ? t("tracking.arrivedOtp", { name }) : undefined} /> : null;

  const statusPanel = arrived ? null : (
    <Panel id="eta-panel">
      <Box sx={{ display: "grid", gap: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("tracking.arrivingIn", { name })}
        </Typography>
        <Typography variant="numericXl" component="p" sx={{ m: 0 }}>
          {etaText ?? t("tracking.anyMinute")}
        </Typography>
        {byText && etaText && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("tracking.expectedBy", { time: byText })}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: stale ? "warning.main" : "text.secondary" }}>
          {tracking ? (stale ? t("common:map.paused", { time: updated }) : t("common:map.updatedAgo", { time: updated })) : t("tracking.noLocationYet", { name })}
        </Typography>
        {tracking && !MAPS_KEY && (
          <Box>
            <Link href={placeUrl(tracking.lat, tracking.lng)} target="_blank" rel="noopener noreferrer">
              {t("tracking.openLocation", { name })}
            </Link>
          </Box>
        )}
      </Box>
    </Panel>
  );

  const panel = (
    <Box sx={{ display: "grid", gap: 5, minWidth: 0, alignContent: "start" }}>
      {arrived ? otpPanel : statusPanel}
      {late && <InlineAlert tone="warning" title={t("tracking.lateTitle")}>{info.fees.freeCancelWhenProfessionalLate ? t("tracking.lateFree") : t("tracking.late")}</InlineAlert>}
      {stale && !arrived && <InlineAlert tone="info">{t("tracking.staleHelp", { name })}</InlineAlert>}
      {pro && (
        <Panel id="pro-panel" title={t("tracking.proTitle")}>
          <ProfessionalCard professional={pro} />
        </Panel>
      )}
      {!arrived && otpPanel}
      <Panel id="progress-panel" title={t("timeline.title")}>
        <BookingTimeline booking={booking} />
      </Panel>
      <Panel id="details-panel" title={t("booking.detailsTitle")}>
        <Box sx={{ display: "grid", gap: 5 }}>
          <AddressBlock booking={booking} />
          <ReceiptLines booking={booking} />
        </Box>
      </Panel>
      <Box sx={{ display: "grid", gap: 3, justifyItems: "start" }}>
        <Button variant="secondary" onClick={() => setCancelling(true)}>
          {t("cancel.open")}
        </Button>
        <HelpLine />
      </Box>
    </Box>
  );

  return (
    <>
      {MAPS_KEY ? (
        <Box sx={{ display: "grid", gap: { xs: 5, md: 8 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 400px" }, alignItems: "start" }}>
          <Box sx={{ position: { md: "sticky" }, top: { md: 88 } }}>
            <LiveMap
              destination={booking.address.location}
              moving={tracking}
              label={t("tracking.mapLabel", { name })}
              destinationTitle={t("tracking.yourAddress")}
              movingTitle={name}
              staleMessage={stale && !arrived ? t("common:map.paused", { time: updated }) : undefined}
              fallbackAddress={addressLine(booking.address)}
              fallbackHref={placeUrl(booking.address.location.lat, booking.address.location.lng)}
              height={{ xs: 320, md: 560 }}
            />
          </Box>
          {panel}
        </Box>
      ) : (
        <Box sx={{ maxWidth: 720 }}>{panel}</Box>
      )}
      {cancelling && <CancelBookingDialog bookingId={booking.id} professionalName={pro?.name ?? null} onClose={() => setCancelling(false)} />}
    </>
  );
}
