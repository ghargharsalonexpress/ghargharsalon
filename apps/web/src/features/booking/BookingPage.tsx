import type { BookingDto, BookingLocationEvent, BookingUpdatedEvent } from "@brand/shared";
import { RT } from "@brand/shared";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Banner, Button, EmptyState, Link, StatusPill, VisuallyHidden } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { useRealtime, useRealtimeStatus } from "@/lib/realtime";
import { bookingQuery } from "./api";
import { dateTimeText } from "./text";
import { AwaitingPaymentView } from "./views/AwaitingPaymentView";
import { CompletedView } from "./views/CompletedView";
import { EndedView } from "./views/EndedView";
import { InProgressView } from "./views/InProgressView";
import { SearchingView } from "./views/SearchingView";
import { TrackingView } from "./views/TrackingView";

const LIVE = new Set(["searching", "accepted", "arrived", "in_progress"]);

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * One URL per booking (plan A7): /bookings/:id shows the view for its current status, so email
 * links always work. Real-time events are hints to refetch; polling is the safety net.
 */
export function BookingPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation("booking");
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const booking = useQuery(bookingQuery(id));
  const connection = useRealtimeStatus();
  const live = booking.data ? LIVE.has(booking.data.status) : false;

  useRealtime(
    {
      [RT.bookingUpdated]: (event: BookingUpdatedEvent) => {
        if (event.bookingId === id) void queryClient.invalidateQueries({ queryKey: bookingQuery(id).queryKey });
      },
      [RT.bookingLocation]: (event: BookingLocationEvent) => {
        if (event.bookingId !== id) return;
        queryClient.setQueryData(bookingQuery(id).queryKey, (previous: BookingDto | undefined) =>
          previous ? { ...previous, tracking: { lat: event.lat, lng: event.lng, heading: event.heading, at: event.at } } : previous,
        );
      },
    },
    { enabled: live, watchBookingId: id, onReconnect: () => void queryClient.invalidateQueries({ queryKey: bookingQuery(id).queryKey }) },
  );

  const data = booking.data;
  const title = data ? titleFor(t, data) : t("booking.loadingTitle");
  usePageMeta(data ? `${title} · ${data.number}` : title);

  if (!data) {
    const notFound = isApiError(booking.error) && (booking.error.code === "NOT_FOUND" || booking.error.code === "FORBIDDEN" || booking.error.code === "VALIDATION_FAILED");
    return (
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
        {booking.isError ? (
          <EmptyState
            headingLevel="h1"
            title={notFound ? t("booking.notFoundTitle") : t("booking.loadErrorTitle")}
            description={notFound ? t("booking.notFoundBody") : errorText(t, booking.error)}
            action={
              notFound ? (
                <Button to="/account/bookings">{t("booking.toBookings")}</Button>
              ) : (
                <Button variant="secondary" onClick={() => void booking.refetch()}>
                  {t("common:action.retry")}
                </Button>
              )
            }
          />
        ) : (
          <Box aria-busy sx={{ display: "grid", gap: 4, maxWidth: 720 }}>
            <VisuallyHidden role="status">{t("common:state.loading")}</VisuallyHidden>
            <Skeleton variant="text" width="50%" height={44} />
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={160} />
          </Box>
        )}
      </Container>
    );
  }

  return (
    <>
      {live && connection === "connecting" && <Banner tone="warning">{t("booking.reconnecting")}</Banner>}
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 5, md: 8 } }}>
        <Box component="header" sx={{ mb: { xs: 5, md: 8 }, display: "grid", gap: 2 }}>
          <Box>
            <Link to="/account/bookings" standalone>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <ArrowBackOutlined aria-hidden sx={{ fontSize: 18 }} />
                {t("booking.toBookings")}
              </Box>
            </Link>
          </Box>
          <Typography variant="h1">{title}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            <StatusPill status={data.status} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("booking.meta", { number: data.number, date: dateTimeText(data.createdAt, i18n.language) })}
            </Typography>
          </Box>
          {/* Status changes are announced politely (plan B11). */}
          <VisuallyHidden aria-live="polite">{title}</VisuallyHidden>
        </Box>
        <StatusView booking={data} />
      </Container>
    </>
  );
}

function StatusView({ booking }: { booking: BookingDto }) {
  switch (booking.status) {
    case "awaiting_payment":
      return <AwaitingPaymentView booking={booking} />;
    case "searching":
      return <SearchingView booking={booking} />;
    case "accepted":
    case "arrived":
      return <TrackingView booking={booking} />;
    case "in_progress":
      return <InProgressView booking={booking} />;
    case "completed":
      return <CompletedView booking={booking} />;
    default:
      return <EndedView booking={booking} />;
  }
}

function titleFor(t: ReturnType<typeof useTranslation>["t"], booking: BookingDto): string {
  const name = booking.professional ? firstName(booking.professional.name) : "";
  switch (booking.status) {
    case "accepted":
      return t("title.accepted", { name });
    case "arrived":
      return t("title.arrived", { name });
    default:
      return t(`title.${booking.status}`);
  }
}
