import { useEffect, useRef } from "react";
import { type BookingUpdatedEvent, type LocationFix, type OfferClosedEvent, type OfferDto, RT } from "@brand/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { rememberFix } from "@/lib/device";
import { useRealtime } from "@/lib/realtime";
import { distanceMeters } from "./distance";
import { jobActions, offerQuery, openOffersQuery, proEarningsQuery, proJobQuery, proJobsQuery, proMeQuery } from "./api";

/**
 * The panel's real-time link (plan C8, W5/W6): a new job alert opens full screen at once; a
 * closed alert or a changed job refreshes what's on screen. Missed events are caught up on
 * reconnect by asking for open alerts.
 */
export function useProRealtime(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onOfferPage = pathname.startsWith("/pro/offers/");

  const showOpenOffer = async () => {
    const open = await queryClient.fetchQuery(openOffersQuery).catch(() => [] as OfferDto[]);
    const next = open.find((offer) => offer.status === "pending" && Date.parse(offer.expiresAt) > Date.now());
    if (next && !window.location.pathname.startsWith("/pro/offers/")) {
      queryClient.setQueryData(offerQuery(next.id).queryKey, next);
      navigate(`/pro/offers/${next.id}`);
    }
  };

  useRealtime(
    {
      [RT.offerNew]: (offer: OfferDto) => {
        queryClient.setQueryData(offerQuery(offer.id).queryKey, offer);
        // One alert at a time: a second one waits until this screen is answered.
        if (!window.location.pathname.startsWith("/pro/offers/")) navigate(`/pro/offers/${offer.id}`);
      },
      [RT.offerClosed]: (event: OfferClosedEvent) => {
        void queryClient.invalidateQueries({ queryKey: offerQuery(event.offerId).queryKey });
      },
      [RT.bookingUpdated]: (event: BookingUpdatedEvent) => {
        void queryClient.invalidateQueries({ queryKey: proJobQuery(event.bookingId).queryKey });
        void queryClient.invalidateQueries({ queryKey: proJobsQuery.queryKey });
        void queryClient.invalidateQueries({ queryKey: proEarningsQuery.queryKey });
        void queryClient.invalidateQueries({ queryKey: proMeQuery.queryKey });
      },
    },
    { onReconnect: () => void showOpenOffer() },
  );

  // Opening the panel (or coming back to it) catches an alert whose event was missed.
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || onOfferPage) return;
    checked.current = true;
    void showOpenOffer();
    // Once per visit to the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const SEND_EVERY_MS = 5_000;
const SEND_AFTER_METERS = 25;
const WORST_ACCURACY_M = 100;

/**
 * Shares the professional's location with the customer while on the way and at the door (plan
 * C8: every 5 s or 25 m; fixes worse than 100 m are skipped). Only while the panel is visible:
 * the web can't track in the background (plan A8), and the customer sees "Location paused".
 */
export function useJobLocation(bookingId: string | null): void {
  const job = useQuery({ ...proJobQuery(bookingId ?? ""), enabled: bookingId !== null });
  const sharing = bookingId !== null && (job.data?.status === "accepted" || job.data?.status === "arrived");

  useEffect(() => {
    if (!sharing || !bookingId || !("geolocation" in navigator)) return;
    type Fix = LocationFix & { heading: number | null };
    let last: { lat: number; lng: number; at: number } | null = null;
    let sending = false;
    // A position that comes in while one is being sent goes out right after it: the last one
    // before stopping (at the door) matters most, and a phone standing still sends no more.
    let waiting: Fix | null = null;
    let stopped = false;

    const consider = (fix: Fix) => {
      if (stopped || document.visibilityState !== "visible" || fix.accuracy > WORST_ACCURACY_M) return;
      if (sending) {
        waiting = fix;
        return;
      }
      const now = Date.now();
      if (last && now - last.at < SEND_EVERY_MS && distanceMeters(last, fix) < SEND_AFTER_METERS) return;
      sending = true;
      jobActions
        .location(bookingId, { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy }, fix.heading)
        .then(() => {
          last = { lat: fix.lat, lng: fix.lng, at: now };
        })
        .catch(() => undefined)
        .finally(() => {
          sending = false;
          const next = waiting;
          waiting = null;
          if (next) consider(next);
        });
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) };
        rememberFix(fix);
        const heading = position.coords.heading !== null && Number.isFinite(position.coords.heading) ? Math.round(position.coords.heading) % 360 : null;
        consider({ ...fix, heading });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [sharing, bookingId]);
}
