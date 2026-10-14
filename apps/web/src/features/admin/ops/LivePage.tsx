import { useMemo } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeTone, Button, InlineAlert, Link, PageHeader, StatusPill } from "@/design-system";
import { type MapPoint, PointsMap } from "@/features/maps/PointsMap";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatRelativeFromNow } from "@/lib/format";
import { clockDuration, useNow } from "@/lib/useNow";
import { liveQuery } from "./api";
import { clock } from "./format";
import { Section } from "./parts";

const PRESENCE_TONE: Record<string, BadgeTone> = { available: "success", busy: "accent", stale: "warning", offline: "neutral" };

/**
 * /admin/live (plan Phase 8): who is online and every booking in motion, refreshed every 10 s.
 * The lists carry everything the map shows (plan B11), so the page works without a Maps key.
 */
export function LivePage() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const live = useQuery(liveQuery);
  const now = useNow(1000);
  usePageMeta(t("live.title"));
  const data = live.data;

  const points = useMemo<MapPoint[]>(() => {
    if (!data) return [];
    return [
      ...data.professionals.flatMap((pro) => (pro.location ? [{ id: `pro:${pro.id}`, ...pro.location, kind: pro.state === "busy" ? ("busy" as const) : pro.state === "stale" ? ("stale" as const) : ("available" as const), title: pro.name }] : [])),
      ...data.bookings.map((booking) => ({ id: `booking:${booking.id}`, ...booking.location, kind: "booking" as const, title: booking.number })),
    ];
  }, [data]);

  if (live.isError && !data) {
    return (
      <>
        <PageHeader title={t("live.title")} />
        <InlineAlert
          tone="danger"
          action={
            <Button variant="tertiary" size="sm" onClick={() => void live.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {errorText(t, live.error)}
        </InlineAlert>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title={t("live.title")} />
        <Box aria-busy sx={{ display: "grid", gap: 4 }}>
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      </>
    );
  }

  const searching = data.bookings.filter((booking) => booking.status === "searching");
  const moving = data.bookings.filter((booking) => booking.status !== "searching");
  const row = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center", py: 3, borderTop: `1px solid ${tokens.neutral[200]}`, "&:first-of-type": { borderTop: 0, pt: 0 } } as const;

  return (
    <>
      <PageHeader title={t("live.title")} description={t("live.updated", { time: clock(data.at) })} />
      <Box sx={{ display: "grid", gap: 6 }}>
        <PointsMap points={points} label={t("live.mapLabel")} />

        <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
          <Section id="live-searching" title={t("live.searching", { count: searching.length })}>
            {searching.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>{t("live.noneSearching")}</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {searching.map((booking) => {
                  const left = booking.deadlineAt ? Date.parse(booking.deadlineAt) - now : null;
                  return (
                    <Box component="li" key={booking.id} sx={row}>
                      <Box sx={{ minWidth: 0 }}>
                        <Link to={`/admin/bookings/${booking.id}`}>{booking.number}</Link>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {booking.area}
                        </Typography>
                      </Box>
                      <Badge tone={left !== null && left < 30_000 ? "warning" : "info"}>{left === null ? t("live.searchingBadge") : left > 0 ? t("live.givesUpIn", { time: clockDuration(left) }) : t("live.endingNow")}</Badge>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Section>

          <Section id="live-jobs" title={t("live.jobs", { count: moving.length })}>
            {moving.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>{t("live.noJobs")}</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {moving.map((booking) => (
                  <Box component="li" key={booking.id} sx={row}>
                    <Box sx={{ minWidth: 0 }}>
                      <Link to={`/admin/bookings/${booking.id}`}>{booking.number}</Link>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {[booking.professionalName, booking.area].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <StatusPill status={booking.status} />
                  </Box>
                ))}
              </Box>
            )}
          </Section>
        </Box>

        <Section id="live-pros" title={t("live.professionals", { count: data.professionals.length })}>
          {data.professionals.length === 0 ? (
            <Typography sx={{ color: "text.secondary" }}>{t("live.nonePros")}</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {data.professionals.map((pro) => (
                <Box component="li" key={pro.id} sx={row}>
                  <Box sx={{ minWidth: 0 }}>
                    <Link to={`/admin/professionals/${pro.id}`}>{pro.name}</Link>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {pro.activeBooking ? (
                        <>
                          {t("live.onJob")} <Link to={`/admin/bookings/${pro.activeBooking.id}`}>{pro.activeBooking.number}</Link>
                        </>
                      ) : pro.locationAt ? (
                        t("live.locationAt", { time: formatRelativeFromNow(new Date(pro.locationAt), "en", new Date(now)) })
                      ) : (
                        t("live.noLocation")
                      )}
                    </Typography>
                  </Box>
                  <Badge tone={PRESENCE_TONE[pro.state] ?? "neutral"} live={pro.state === "available"}>
                    {t(`professionals.presence.${pro.state}`)}
                  </Badge>
                </Box>
              ))}
            </Box>
          )}
        </Section>
      </Box>
    </>
  );
}

