import { useState } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { Button, CountdownRing, MapView, OtpDisplay, OtpInput, PriceSummary, StatusTracker } from "@/design-system";
import { formatRelativeFromNow, formatTime } from "@/lib/format";
import { Grid, Section, Specimen } from "../parts";

const at = (hour: number, minute: number) => new Date(2026, 9, 5, hour, minute);

export function Booking() {
  const { t, i18n } = useTranslation("styleguide");
  const lang = i18n.language;
  const [otp, setOtp] = useState("");
  const [endsAt, setEndsAt] = useState(() => Date.now() + 30_000);
  const otpError = otp.length === 4 && otp !== "4827" ? t("booking.otpMismatch") : undefined;

  return (
    <Section
      id="booking"
      title="Booking components"
      description="The pieces of the instant-booking flow: the price summary before payment, the status tracker, the start OTP, the 30-second job alert countdown and the map container."
      rules={[
        "The total before Pay is final: prices include GST, the platform fee is its own line.",
        "The map is never the only source of information; status and arrival time are always written next to it.",
        "When the professional's location is older than 45 seconds the map says so instead of pretending to be live.",
      ]}
    >
      <Grid min={300}>
        <Specimen label="Price summary">
          <PriceSummary
            lines={[
              { id: "facial", label: t("samples:checkout.items.facial"), amountPaise: 64_900 },
              { id: "wax", label: t("samples:checkout.items.wax"), amountPaise: 39_000, quantity: 1 },
            ]}
            platformFeePaise={1_100}
            totalPaise={104_900}
          />
        </Specimen>
        <Specimen label="Status tracker">
          <StatusTracker
            label={t("booking.progress")}
            steps={[
              { id: "paid", label: t("booking.paid"), time: formatTime(at(16, 30), lang), state: "done" },
              { id: "accepted", label: t("booking.accepted", { name: "Priya" }), time: formatTime(at(16, 31), lang), state: "done" },
              {
                id: "way",
                label: t("common:status.accepted"),
                time: formatTime(at(16, 31), lang),
                detail: t("samples:checkout.arrives", { range: t("common:duration.minutes", { count: 9 }) }),
                state: "current",
              },
              { id: "progress", label: t("common:status.in_progress"), state: "upcoming" },
              { id: "done", label: t("common:status.completed"), state: "upcoming" },
            ]}
          />
        </Specimen>
        <Specimen label="Start OTP (customer)">
          <OtpDisplay code="4827" />
        </Specimen>
        <Specimen label="OTP input (professional) · try 4827">
          <OtpInput value={otp} onChange={setOtp} error={otpError} attemptsLeft={otpError ? 4 : undefined} />
        </Specimen>
        <Specimen label="Job alert countdown">
          <Box sx={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <CountdownRing totalSeconds={30} endsAt={endsAt} />
            <Button variant="secondary" onClick={() => setEndsAt(Date.now() + 30_000)}>
              Restart 30 s
            </Button>
          </Box>
        </Specimen>
      </Grid>
      <Grid min={300}>
        <Specimen label="Map: loading">
          <MapView status="loading" label={t("booking.proLocation")} height={200} />
        </Specimen>
        <Specimen label="Map: live">
          <MapView status="ready" label={t("booking.proLocation")} height={200} />
        </Specimen>
        <Specimen label="Map: location paused">
          <MapView
            status="ready"
            label={t("booking.proLocation")}
            height={200}
            staleMessage={t("common:map.paused", { time: formatRelativeFromNow(at(16, 28), lang, at(16, 31)) })}
          />
        </Specimen>
        <Specimen label="Map: failed to load">
          <MapView
            status="error"
            label={t("booking.customerAddress")}
            height={200}
            fallbackAddress={t("samples:checkout.addressLine")}
            fallbackHref="https://maps.google.com/?q=Sector+15+Faridabad"
          />
        </Specimen>
      </Grid>
    </Section>
  );
}
