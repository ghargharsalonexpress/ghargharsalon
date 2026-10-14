import { useState } from "react";
import { type LocationFix, pick, PRO_CANCEL_REASONS, type ProJobDto } from "@brand/shared";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CallOutlined from "@mui/icons-material/CallOutlined";
import NavigationOutlined from "@mui/icons-material/NavigationOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { brand } from "@/brand";
import { Button, ConfirmDialog, EmptyState, InlineAlert, Link, OtpInput, RadioCards, StatusPill, useToast } from "@/design-system";
import { addressLine } from "@/features/booking/text";
import { LiveMap } from "@/features/maps/LiveMap";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { durationText } from "@/lib/duration";
import { errorText } from "@/lib/errors";
import { formatDistance, formatMoney, formatTime } from "@/lib/format";
import { directionsUrl, MAPS_KEY, placeUrl } from "@/lib/maps";
import { recentFix } from "@/lib/device";
import { clockDuration, useNow } from "@/lib/useNow";
import { currentFix, jobActions, proEarningsQuery, proJobQuery, proJobsQuery, proMeQuery } from "./api";
import { distanceMeters } from "./distance";

type Busy = null | "arrived" | "start" | "complete" | "unreachable" | "cancel";
type CancelReason = (typeof PRO_CANCEL_REASONS)[number];

/**
 * One job, start to finish (plan Phase 7, W7/W8). The main button follows the stage: Navigate →
 * I've arrived → the customer's code → Complete service. Every step is checked by the server.
 */
export function ProJobPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation("pro");
  const lang = i18n.language;
  const { tokens } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const job = useQuery(proJobQuery(id));
  const now = useNow(1000);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<unknown>(null);
  const [navigated, setNavigated] = useState(false);
  const [far, setFar] = useState<{ meters: number | null; location: LocationFix | undefined } | null>(null);
  const [earlyConfirm, setEarlyConfirm] = useState(false);
  const [unreachableConfirm, setUnreachableConfirm] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  usePageMeta(job.data ? t("job.metaTitle", { number: job.data.number }) : t("nav.jobs"));

  const store = (updated: ProJobDto) => queryClient.setQueryData(proJobQuery(id).queryKey, updated);
  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: proJobsQuery.queryKey });
    void queryClient.invalidateQueries({ queryKey: proEarningsQuery.queryKey });
    void queryClient.invalidateQueries({ queryKey: proMeQuery.queryKey });
  };

  if (!job.data) {
    return job.isError ? (
      <EmptyState
        headingLevel="h1"
        title={t("job.loadErrorTitle")}
        description={errorText(t, job.error)}
        action={
          <Button variant="secondary" to="/pro/jobs">
            {t("job.toJobs")}
          </Button>
        }
      />
    ) : (
      <Box aria-busy sx={{ display: "grid", gap: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={160} />
      </Box>
    );
  }

  const data = job.data;
  const destination = data.address.location;

  const markArrived = async (confirmFar: boolean, known?: LocationFix) => {
    setError(null);
    setBusy("arrived");
    let location = known;
    try {
      // The panel's location watch usually has a fresh fix; only wait for GPS when it doesn't.
      location ??= recentFix(120_000) ?? (await currentFix().catch(() => undefined));
      store(await jobActions.arrived(id, { ...(location ? { location } : {}), ...(confirmFar ? { confirmFar: true } : {}) }));
      setFar(null);
      toast(t("job.arrivedToast"));
    } catch (failure) {
      if (isApiError(failure) && failure.code === "CONFIRM_REQUIRED") setFar({ meters: location ? distanceMeters(location, destination) : null, location });
      else setError(failure);
    } finally {
      setBusy(null);
    }
  };

  const start = async () => {
    if (!/^\d{4}$/.test(otp)) {
      setOtpError(t("common:validation.otp"));
      return;
    }
    setOtpError(null);
    setError(null);
    setBusy("start");
    try {
      store(await jobActions.start(id, otp));
      setOtp("");
      toast(t("job.startedToast"));
    } catch (failure) {
      if (isApiError(failure) && failure.code === "OTP_INVALID") setOtpError(t("common:validation.otpWrong"));
      else setError(failure);
      void job.refetch();
    } finally {
      setBusy(null);
    }
  };

  const complete = async (confirmEarly: boolean) => {
    setError(null);
    setBusy("complete");
    try {
      const done = await jobActions.complete(id, confirmEarly);
      store(done);
      setEarlyConfirm(false);
      refreshLists();
      toast(t("job.completedToast", { amount: formatMoney(done.earningsPaise, lang) }));
    } catch (failure) {
      if (isApiError(failure) && failure.code === "CONFIRM_REQUIRED") setEarlyConfirm(true);
      else {
        setEarlyConfirm(false);
        setError(failure);
      }
    } finally {
      setBusy(null);
    }
  };

  const unreachable = async () => {
    setError(null);
    setBusy("unreachable");
    try {
      store(await jobActions.customerUnavailable(id));
      setUnreachableConfirm(false);
      refreshLists();
      toast(t("job.unreachableToast"));
    } catch (failure) {
      setUnreachableConfirm(false);
      setError(failure);
    } finally {
      setBusy(null);
    }
  };

  const cancelJob = async () => {
    if (!cancelReason) return;
    setError(null);
    setBusy("cancel");
    try {
      await jobActions.cancel(id, cancelReason);
      refreshLists();
      toast(t("job.cancelledToast"));
      navigate("/pro", { replace: true });
    } catch (failure) {
      setCancelOpen(false);
      setError(failure);
    } finally {
      setBusy(null);
    }
  };

  const logCall = () => void jobActions.logCall(id).then(() => job.refetch(), () => undefined);

  const card = { bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: 5 } as const;
  const live = data.status === "accepted" || data.status === "arrived" || data.status === "in_progress";
  const startedAt = data.startedAt ? Date.parse(data.startedAt) : null;
  const noShowAt = data.noShowAvailableAt ? Date.parse(data.noShowAvailableAt) : null;
  const canMarkUnreachable = data.status === "arrived" && noShowAt !== null && now >= noShowAt && data.callAttempts >= 2;

  return (
    <Box sx={{ display: "grid", gap: 5 }}>
      <Box>
        <Link to="/pro/jobs" standalone>
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <ArrowBackOutlined aria-hidden sx={{ fontSize: 18 }} />
            {t("job.toJobs")}
          </Box>
        </Link>
      </Box>

      <Box sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h1" sx={{ typography: "h2" }}>
          {t(`job.title.${data.status}`, { name: data.customer.firstName, defaultValue: t("job.title.other") })}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
          <StatusPill status={data.status} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {data.number}
          </Typography>
        </Box>
      </Box>

      {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}

      {/* The stage's one main action. */}
      {data.status === "accepted" && (
        <Box sx={{ ...card, display: "grid", gap: 4 }}>
          {data.eta && (
            <Typography sx={{ color: "text.secondary" }}>
              {t("job.expected", { time: formatTime(new Date(Date.parse(data.eta.at) + data.eta.maxMinutes * 60_000), lang) })}
            </Typography>
          )}
          <Button
            size="lg"
            fullWidth
            variant={navigated ? "secondary" : "primary"}
            href={directionsUrl(destination.lat, destination.lng)}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<NavigationOutlined />}
            onClick={() => setNavigated(true)}
            sx={{ minHeight: 56 }}
          >
            {t("job.navigate")}
          </Button>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("job.navigateHint")}
          </Typography>
          <Button size="lg" fullWidth variant={navigated ? "primary" : "secondary"} loading={busy === "arrived"} onClick={() => void markArrived(false)} sx={{ minHeight: 56 }}>
            {t("job.arrived")}
          </Button>
        </Box>
      )}

      {data.status === "arrived" && (
        <Box sx={{ ...card, display: "grid", gap: 4 }}>
          {data.otpLocked ? (
            <InlineAlert tone="danger" title={t("job.otpLockedTitle")}>
              {t("job.otpLockedBody", { phone: brand.supportPhone })}
            </InlineAlert>
          ) : (
            <Box
              component="form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void start();
              }}
              sx={{ display: "grid", gap: 4 }}
            >
              <OtpInput value={otp} onChange={setOtp} label={t("job.otpLabel", { name: data.customer.firstName })} error={otpError ?? undefined} attemptsLeft={data.otpAttemptsLeft} disabled={busy === "start"} />
              <Button type="submit" size="lg" fullWidth loading={busy === "start"} sx={{ minHeight: 56 }}>
                {t("job.start")}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {data.status === "in_progress" && startedAt !== null && (
        <Box sx={{ ...card, display: "grid", gap: 3 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("job.startedAt", { time: formatTime(new Date(startedAt), lang) })}
          </Typography>
          <Typography variant="numericXl" component="p" role="timer" aria-label={t("job.timerLabel")} sx={{ m: 0 }}>
            {clockDuration(now - startedAt)}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("job.expectedDuration", { duration: durationText(t, data.expectedDurationMin) })}
          </Typography>
          <Button size="lg" fullWidth loading={busy === "complete"} onClick={() => void complete(false)} sx={{ minHeight: 56, mt: 2 }}>
            {t("job.complete")}
          </Button>
        </Box>
      )}

      {data.status === "completed" && (
        <InlineAlert tone="success" title={t("job.doneTitle")}>
          {t("job.doneBody", { amount: formatMoney(data.earningsPaise, lang) })}
        </InlineAlert>
      )}

      {(data.status === "cancelled" || data.status === "searching" || data.status === "no_professional_found") && (
        <InlineAlert tone="warning" title={t("job.endedTitle")}>
          {data.cancellation?.reason === "customer_unavailable" ? t("job.endedUnreachable") : data.cancellation?.by === "customer" ? t("job.endedByCustomer") : t("job.endedBody")}
        </InlineAlert>
      )}

      {/* The customer and the place. Phone numbers only while the job is live (plan A7). */}
      <Box component="section" aria-labelledby="customer-title" sx={{ ...card, display: "grid", gap: 4 }}>
        <Typography id="customer-title" variant="h3" component="h2">
          {t("job.customerTitle")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 600 }}>{data.customer.firstName}</Typography>
          {data.customer.phone && live && (
            <Button variant="secondary" href={`tel:+91${data.customer.phone}`} startIcon={<CallOutlined />} onClick={logCall}>
              {t("job.call")}
            </Button>
          )}
        </Box>
        <Box>
          <Typography>{addressLine(data.address)}</Typography>
          {data.address.landmark && <Typography sx={{ color: "text.secondary" }}>{t("job.near", { landmark: data.address.landmark })}</Typography>}
          {data.note && (
            <Box sx={{ mt: 3 }}>
              <InlineAlert tone="info" title={t("job.noteTitle")}>
                {data.note}
              </InlineAlert>
            </Box>
          )}
        </Box>
        {MAPS_KEY && live && (
          <LiveMap
            destination={destination}
            moving={null}
            label={t("job.mapLabel")}
            destinationTitle={t("job.customerTitle")}
            movingTitle=""
            fallbackAddress={addressLine(data.address)}
            fallbackHref={placeUrl(destination.lat, destination.lng)}
            height={{ xs: 220, md: 280 }}
          />
        )}
      </Box>

      {data.status === "arrived" && !data.otpLocked && (
        <Box component="section" aria-labelledby="unreachable-title" sx={{ ...card, display: "grid", gap: 3 }}>
          <Typography id="unreachable-title" variant="h3" component="h2">
            {t("job.unreachableTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("job.unreachableBody")}
          </Typography>
          <Typography variant="body2">{t("job.calls", { count: data.callAttempts })}</Typography>
          {noShowAt !== null && now < noShowAt && (
            <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {t("job.unreachableIn", { time: clockDuration(noShowAt - now) })}
            </Typography>
          )}
          <Box>
            <Button variant="secondary" disabled={!canMarkUnreachable} onClick={() => setUnreachableConfirm(true)}>
              {t("job.unreachable")}
            </Button>
          </Box>
        </Box>
      )}

      <Box component="section" aria-labelledby="services-title" sx={{ ...card, display: "grid", gap: 3 }}>
        <Typography id="services-title" variant="h3" component="h2">
          {t("job.servicesTitle")}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 5, display: "grid", gap: 1 }}>
          {data.items.map((item) => (
            <li key={`${item.serviceSlug}:${item.tierId}`}>
              {item.tierCount > 1 ? `${pick(item.name, lang)} · ${pick(item.tierLabel, lang)}` : pick(item.name, lang)}
              {item.quantity > 1 ? ` × ${item.quantity}` : ""}
            </li>
          ))}
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("job.expectedDuration", { duration: durationText(t, data.expectedDurationMin) })}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3 }}>
          <Typography>{t("job.youEarn")}</Typography>
          <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: tokens.semantic.success.fg }}>{formatMoney(data.earningsPaise, lang)}</Typography>
        </Box>
      </Box>

      {(data.status === "accepted" || data.status === "arrived") && (
        <Box>
          <Button variant="tertiary" onClick={() => setCancelOpen(true)}>
            {t("job.cancel")}
          </Button>
        </Box>
      )}
      {!live && (
        <Box>
          <Button variant="secondary" to="/pro">
            {t("job.toHome")}
          </Button>
        </Box>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("job.help")} <Link href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}>{brand.supportPhone}</Link>
      </Typography>

      <ConfirmDialog
        open={far !== null}
        onClose={() => setFar(null)}
        onConfirm={() => void markArrived(true, far?.location)}
        title={t("job.farTitle")}
        consequence={far?.meters ? t("job.farBody", { distance: formatDistance(far.meters, lang) }) : t("job.farBodyUnknown")}
        confirmLabel={t("job.farConfirm")}
        cancelLabel={t("job.farCancel")}
        tone="primary"
        loading={busy === "arrived"}
      />
      <ConfirmDialog
        open={earlyConfirm}
        onClose={() => setEarlyConfirm(false)}
        onConfirm={() => void complete(true)}
        title={t("job.earlyTitle")}
        consequence={t("job.earlyBody", { elapsed: durationText(t, Math.max(1, Math.round((now - (startedAt ?? now)) / 60_000))), expected: durationText(t, data.expectedDurationMin) })}
        confirmLabel={t("job.earlyConfirm")}
        cancelLabel={t("job.earlyCancel")}
        tone="primary"
        loading={busy === "complete"}
      />
      <ConfirmDialog
        open={unreachableConfirm}
        onClose={() => setUnreachableConfirm(false)}
        onConfirm={() => void unreachable()}
        title={t("job.unreachableConfirmTitle")}
        consequence={t("job.unreachableConfirmBody")}
        confirmLabel={t("job.unreachableConfirm")}
        loading={busy === "unreachable"}
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void cancelJob()}
        title={t("job.cancelTitle")}
        consequence={t("job.cancelBody")}
        confirmLabel={t("job.cancelConfirm")}
        cancelLabel={t("job.cancelKeep")}
        loading={busy === "cancel"}
      >
        <Box sx={{ display: "grid", gap: 3 }}>
          <RadioCards<CancelReason>
            legend={t("job.cancelReason")}
            name="pro-cancel-reason"
            value={cancelReason}
            onChange={setCancelReason}
            options={PRO_CANCEL_REASONS.map((reason) => ({ value: reason, label: t(`job.cancelReasons.${reason}`) }))}
          />
          {!cancelReason && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("job.cancelReasonHint")}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: "warning.main" }}>
            {t("job.cancelNote")}
          </Typography>
        </Box>
      </ConfirmDialog>
    </Box>
  );
}
