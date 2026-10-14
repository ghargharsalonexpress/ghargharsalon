import { ACTIVE_STATUSES, type BookingSummaryDto } from "@brand/shared";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Button, EmptyState, InlineAlert, PageHeader, StatusPill } from "@/design-system";
import { myBookingsQuery } from "@/features/booking/api";
import { dateTimeText, itemsTitle } from "@/features/booking/text";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatMoney } from "@/lib/format";

/** My bookings (plan A7 /account/bookings): current first, then past; "Load more" for history (plan B8). */
export function MyBookingsPage() {
  const { t } = useTranslation("account");
  const bookings = useInfiniteQuery(myBookingsQuery);
  usePageMeta(t("bookings.title"));

  const all = bookings.data?.pages.flat() ?? [];
  const current = all.filter((booking) => ACTIVE_STATUSES.includes(booking.status));
  const past = all.filter((booking) => !ACTIVE_STATUSES.includes(booking.status));

  return (
    <Box>
      <PageHeader title={t("bookings.title")} />
      {bookings.isPending ? (
        <Box aria-busy sx={{ display: "grid", gap: 3 }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} variant="rounded" height={96} />
          ))}
        </Box>
      ) : bookings.isError ? (
        <InlineAlert
          tone="danger"
          action={
            <Button variant="tertiary" size="sm" onClick={() => void bookings.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {errorText(t, bookings.error)}
        </InlineAlert>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<EventNoteOutlined />}
          title={t("bookings.emptyTitle")}
          description={t("bookings.emptyBody")}
          action={
            <Button to="/services" size="lg">
              {t("bookings.browse")}
            </Button>
          }
        />
      ) : (
        <Box sx={{ display: "grid", gap: 8 }}>
          {current.length > 0 && <BookingList id="current-bookings" title={t("bookings.current")} bookings={current} />}
          {past.length > 0 && <BookingList id="past-bookings" title={t("bookings.past")} bookings={past} />}
          {bookings.hasNextPage && (
            <Box>
              <Button variant="secondary" onClick={() => void bookings.fetchNextPage()} loading={bookings.isFetchingNextPage}>
                {t("bookings.loadMore")}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function BookingList({ id, title, bookings }: { id: string; title: string; bookings: BookingSummaryDto[] }) {
  const { t, i18n } = useTranslation("account");
  const { tokens } = useTheme();
  const lang = i18n.language;

  return (
    <Box component="section" aria-labelledby={id}>
      <Typography id={id} variant="h2" sx={{ typography: "h3", mb: 3 }}>
        {title}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Box
              component={RouterLink}
              to={`/bookings/${booking.id}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                alignItems: "center",
                gap: 4,
                p: 4,
                border: `1px solid ${tokens.neutral[200]}`,
                borderRadius: `${tokens.radius.md}px`,
                color: "text.primary",
                textDecoration: "none",
                bgcolor: tokens.neutral[0],
                transition: `border-color ${tokens.motion.duration.fast}ms`,
                "&:hover": { borderColor: tokens.neutral[500] },
                "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
              }}
            >
              <Box sx={{ minWidth: 0, display: "grid", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography component="span" sx={{ fontWeight: 600 }}>
                    {itemsTitle(t, booking.items, lang)}
                  </Typography>
                  <StatusPill status={booking.status} />
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {[booking.number, dateTimeText(booking.createdAt, lang), booking.professionalName].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography component="span" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(booking.totalPaise, lang)}
                </Typography>
                <ChevronRightOutlined aria-hidden sx={{ color: tokens.neutral[600] }} />
              </Box>
            </Box>
          </li>
        ))}
      </Box>
    </Box>
  );
}
