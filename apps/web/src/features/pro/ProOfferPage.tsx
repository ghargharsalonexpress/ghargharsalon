import { type ReactNode, useEffect, useRef, useState } from "react";
import { DECLINE_REASONS, type DeclineReason, type OfferDto, pick } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Badge, Button, CountdownRing, EmptyState, InlineAlert, ResponsiveDialog, useToast } from "@/design-system";
import { bookingQuery } from "@/features/booking/api";
import { usePageMeta } from "@/features/public/usePageMeta";
import { playAlarm } from "@/lib/alarm";
import { isApiError } from "@/lib/api";
import { durationText } from "@/lib/duration";
import { errorText } from "@/lib/errors";
import { formatDistance, formatMoney } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { acceptOffer, declineOffer, offerQuery, openOffersQuery, proJobsQuery, proMeQuery } from "./api";

/**
 * The job alert (plan Phase 6 UX), full screen: how far, roughly where (never the exact address
 * before accepting), what, and what they earn; a 30 s ring and one-hand actions at the bottom.
 * The alarm rings while it's open. "Accept" from the notification arrives as ?intent=accept.
 */
export function ProOfferPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation("pro");
  const lang = i18n.language;
  const { tokens } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const offer = useQuery(offerQuery(id));
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [askReason, setAskReason] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [expired, setExpired] = useState(false);
  usePageMeta(t("offer.metaTitle"), undefined, { overlay: true });

  const now = useNow(1000);
  const data = offer.data;
  const pending = data?.status === "pending" && !expired && Date.parse(data.expiresAt) > now;

  // The alarm rings while the alert is open and unanswered (plan C10).
  useEffect(() => {
    if (!pending) return;
    return playAlarm();
  }, [pending]);

  const accept = async () => {
    setError(null);
    setAccepting(true);
    try {
      const booking = await acceptOffer(id);
      queryClient.setQueryData(bookingQuery(booking.id).queryKey, booking);
      void queryClient.invalidateQueries({ queryKey: proMeQuery.queryKey });
      void queryClient.invalidateQueries({ queryKey: proJobsQuery.queryKey });
      toast(t("offer.accepted"));
      navigate(`/pro/jobs/${booking.id}`, { replace: true });
    } catch (failure) {
      setError(failure);
      void offer.refetch();
    } finally {
      setAccepting(false);
    }
  };

  // "Accept" tapped on the notification: accept once, as soon as the alert has loaded.
  const intentHandled = useRef(false);
  const wantsAccept = params.get("intent") === "accept";
  useEffect(() => {
    if (!wantsAccept || !pending || intentHandled.current) return;
    intentHandled.current = true;
    setParams({}, { replace: true });
    void accept();
    // accept() reads the latest state when it runs; this fires once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsAccept, pending]);

  const decline = async (reason?: DeclineReason) => {
    setError(null);
    setDeclining(true);
    try {
      await declineOffer(id, reason);
      void queryClient.invalidateQueries({ queryKey: openOffersQuery.queryKey });
      toast(t("offer.declined"));
      navigate("/pro", { replace: true });
    } catch (failure) {
      setAskReason(false);
      setError(failure);
      void offer.refetch();
    } finally {
      setDeclining(false);
    }
  };

  if (!data) {
    return (
      <Shell>
        {offer.isError ? (
          <EmptyState
            headingLevel="h1"
            title={t("offer.loadErrorTitle")}
            description={errorText(t, offer.error)}
            action={
              <Button variant="secondary" to="/pro">
                {t("offer.toHome")}
              </Button>
            }
          />
        ) : (
          <Box aria-busy sx={{ display: "grid", gap: 4, pt: 6 }}>
            <Skeleton variant="text" width="60%" height={44} />
            <Skeleton variant="rounded" height={260} />
          </Box>
        )}
      </Shell>
    );
  }

  if (!pending && !accepting) return <OfferEnded offer={data} error={error} />;

  const n = tokens.neutral;
  return (
    <Shell>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1">{t("offer.title")}</Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            {t("offer.away", { distance: formatDistance(data.distanceMeters, lang), range: t("common:duration.range", { min: data.etaMinutes.min, max: data.etaMinutes.max }) })}
          </Typography>
          {data.direct && (
            <Box sx={{ mt: 2 }}>
              <Badge tone="info">{t("offer.direct")}</Badge>
            </Box>
          )}
        </Box>
        <CountdownRing totalSeconds={Math.max(1, Math.round((Date.parse(data.expiresAt) - Date.parse(data.sentAt)) / 1000))} endsAt={Date.parse(data.expiresAt)} size={96} onExpire={() => setExpired(true)} />
      </Box>

      <Box component="dl" sx={{ m: 0, mt: 6, border: `1px solid ${n[200]}`, borderRadius: `${tokens.radius.md}px`, overflow: "hidden" }}>
        <Box sx={{ p: 5, borderBottom: `1px solid ${n[200]}` }}>
          <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
            {t("offer.services")}
          </Typography>
          {data.items.map((item, index) => (
            <Typography key={`${pick(item.name, "en")}-${index}`} component="dd" variant={index === 0 ? "h3" : "body1"} sx={{ m: 0, mt: index === 0 ? 1 : 0.5 }}>
              {item.tierCount > 1 ? `${pick(item.name, lang)} · ${pick(item.tierLabel, lang)}` : pick(item.name, lang)}
              {item.quantity > 1 ? ` × ${item.quantity}` : ""}
            </Typography>
          ))}
          <Typography component="dd" variant="body2" sx={{ m: 0, mt: 1, color: "text.secondary" }}>
            {t("offer.duration", { duration: durationText(t, data.totalDurationMin) })}
          </Typography>
        </Box>
        <Box sx={{ p: 5, borderBottom: `1px solid ${n[200]}` }}>
          <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
            {t("offer.area")}
          </Typography>
          <Typography component="dd" sx={{ m: 0, mt: 1 }}>
            {data.locality}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.5, color: "text.secondary" }}>
            {t("offer.addressAfter")}
          </Typography>
        </Box>
        <Box sx={{ p: 5, bgcolor: n[25] }}>
          <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
            {t("offer.earn")}
          </Typography>
          <Typography component="dd" variant="numericXl" sx={{ m: 0, mt: 1, display: "block", color: tokens.semantic.success.fg }}>
            {formatMoney(data.earningsPaise, lang)}
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Box sx={{ mt: 4 }}>
          <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert>
        </Box>
      ) : null}

      <Box sx={{ mt: "auto", pt: 8, pb: "calc(20px + env(safe-area-inset-bottom))", display: "grid", gap: 3 }}>
        <Button size="lg" fullWidth onClick={() => void accept()} loading={accepting} disabled={declining} sx={{ minHeight: 56 }}>
          {t("offer.accept")}
        </Button>
        <Button size="lg" variant="secondary" fullWidth onClick={() => setAskReason(true)} disabled={accepting || declining}>
          {t("offer.decline")}
        </Button>
      </Box>

      <ResponsiveDialog
        open={askReason}
        onClose={() => setAskReason(false)}
        title={t("offer.declineTitle")}
        description={t("offer.declineBody")}
        actions={
          <Button variant="secondary" onClick={() => void decline()} loading={declining}>
            {t("offer.declineNoReason")}
          </Button>
        }
      >
        <Box sx={{ display: "grid", gap: 2 }}>
          {DECLINE_REASONS.map((reason) => (
            <Button key={reason} variant="secondary" size="lg" fullWidth disabled={declining} onClick={() => void decline(reason)} sx={{ justifyContent: "flex-start" }}>
              {t(`offer.reasons.${reason}`)}
            </Button>
          ))}
        </Box>
      </ResponsiveDialog>
    </Shell>
  );
}

/** Full-screen frame without the tabs: one decision on screen. */
function Shell({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: tokens.neutral[0], display: "flex", flexDirection: "column" }}>
      <Box component="main" id="main" sx={{ flex: 1, width: "100%", maxWidth: 480, mx: "auto", px: 5, pt: "calc(24px + env(safe-area-inset-top))", display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Box>
  );
}

/** Taken, expired or withdrawn: say so plainly and go back to waiting. */
function OfferEnded({ offer, error }: { offer: OfferDto; error: unknown }) {
  const { t } = useTranslation("pro");
  const taken = isApiError(error) && error.code === "OFFER_TAKEN";
  const reason = taken ? "taken" : offer.status === "accepted" ? "accepted" : offer.status === "declined" ? "declined" : offer.status === "revoked" ? "revoked" : "expired";
  return (
    <Shell>
      <EmptyState
        headingLevel="h1"
        title={t(`offer.ended.${reason}.title`)}
        description={t(`offer.ended.${reason}.body`)}
        action={
          reason === "accepted" ? (
            <Button to={`/pro/jobs/${offer.bookingId}`}>{t("offer.openJob")}</Button>
          ) : (
            <Button to="/pro">{t("offer.toHome")}</Button>
          )
        }
      />
    </Shell>
  );
}
