import type { ReactNode } from "react";
import { type BookingDto, type BookingProfessionalDto, type BookingStatus, mediaUrl, pick } from "@brand/shared";
import CallOutlined from "@mui/icons-material/CallOutlined";
import StarRounded from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Avatar, Badge, Button, Link, PriceSummary, StatusTracker, type TrackerStep, VisuallyHidden } from "@/design-system";
import { formatDate, formatMoney, formatNumber, formatTime } from "@/lib/format";
import { MEDIA_BASE_URL } from "@/lib/media";
import { addressLine } from "./text";

/** A bordered section with its own heading (h2). */
export function Panel({ title, id, children, tone = "plain" }: { title?: ReactNode; id: string; children: ReactNode; tone?: "plain" | "accent" }) {
  const { tokens } = useTheme();
  return (
    <Box
      component="section"
      aria-labelledby={title ? id : undefined}
      sx={{
        border: `1px solid ${tone === "accent" ? tokens.accent[200] : tokens.neutral[200]}`,
        borderRadius: `${tokens.radius.md}px`,
        p: { xs: 5, md: 6 },
        bgcolor: tone === "accent" ? tokens.accent[50] : tokens.neutral[0],
        minWidth: 0,
      }}
    >
      {title && (
        <Typography id={id} variant="h3" component="h2" sx={{ mb: 4 }}>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/** Who is coming (plan Phase 7): photo, name, rating and, inside the reveal window, Call. */
export function ProfessionalCard({ professional, action }: { professional: BookingProfessionalDto; action?: ReactNode }) {
  const { t, i18n } = useTranslation("booking");
  const photo = professional.photo ? mediaUrl(MEDIA_BASE_URL, professional.photo, Math.min(...professional.photo.widths), "webp") : undefined;
  const rated = professional.rating !== null && professional.ratingCount > 0;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <Avatar name={professional.name} src={photo} size="lg" decorative />
      <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{professional.name}</Typography>
        <Typography variant="body2" component="p" sx={{ m: 0, mt: 0.5, color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
          {rated ? (
            <>
              <StarRounded aria-hidden sx={{ fontSize: 16, color: "warning.main" }} />
              <span aria-hidden>{formatNumber(professional.rating ?? 0, i18n.language)}</span>
              <span aria-hidden>{`· ${t("pro.ratings", { count: professional.ratingCount })}`}</span>
              <VisuallyHidden>{t("pro.ratedLabel", { rating: formatNumber(professional.rating ?? 0, i18n.language), count: professional.ratingCount })}</VisuallyHidden>
            </>
          ) : (
            t("pro.new", { brand: brand.name })
          )}
        </Typography>
      </Box>
      {professional.phone ? (
        <Button variant="secondary" href={`tel:+91${professional.phone}`} startIcon={<CallOutlined />}>
          {t("pro.call")}
        </Button>
      ) : null}
      {action}
    </Box>
  );
}

const STEPS: ReadonlyArray<{ status: BookingStatus; key: string }> = [
  { status: "searching", key: "paid" },
  { status: "accepted", key: "accepted" },
  { status: "arrived", key: "arrived" },
  { status: "in_progress", key: "started" },
  { status: "completed", key: "completed" },
];

/** Paid → on the way → arrived → started → completed, with times (plan B8 StatusTracker). */
export function BookingTimeline({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  // A professional who cancels sends the booking back to searching; only the latest attempt counts.
  const lastSearch = booking.timeline.map((entry) => entry.status).lastIndexOf("searching");
  const firstPaid = booking.timeline.find((entry) => entry.status === "searching");
  const latest = booking.timeline.slice(Math.max(0, lastSearch));
  const reached = (status: BookingStatus) => (status === "searching" ? firstPaid : latest.find((entry) => entry.status === status));
  const active = booking.status !== "completed";
  const currentIndex = STEPS.findIndex((step) => step.status === booking.status);

  const steps: TrackerStep[] = STEPS.map((step, index) => {
    const entry = reached(step.status);
    const state = active && index === currentIndex ? "current" : entry ? "done" : "upcoming";
    return {
      id: step.key,
      label: t(`timeline.${step.key}`),
      time: entry ? formatTime(new Date(entry.at), lang) : undefined,
      detail: step.status === "accepted" && entry && booking.professional ? booking.professional.name : undefined,
      state,
    };
  });
  return <StatusTracker label={t("timeline.label")} steps={steps} />;
}

/** What was booked and paid (receipt). */
export function ReceiptLines({ booking }: { booking: BookingDto }) {
  const { i18n } = useTranslation("booking");
  const lang = i18n.language;
  return (
    <PriceSummary
      lines={booking.items.map((item) => ({
        id: `${item.serviceSlug}:${item.tierId}`,
        label: item.tierCount > 1 ? `${pick(item.name, lang)} · ${pick(item.tierLabel, lang)}` : pick(item.name, lang),
        amountPaise: item.linePaise,
        quantity: item.quantity,
      }))}
      platformFeePaise={booking.pricing.platformFeePaise}
      totalPaise={booking.pricing.totalPaise}
    />
  );
}

/** The address as the professional will see it. */
export function AddressBlock({ booking }: { booking: BookingDto }) {
  const { t } = useTranslation("booking");
  return (
    <Box>
      <Typography sx={{ fontWeight: 600 }}>{t(`address.labels.${booking.address.label}`)}</Typography>
      <Typography sx={{ color: "text.secondary" }}>{addressLine(booking.address)}</Typography>
      {booking.address.landmark && <Typography sx={{ color: "text.secondary" }}>{t("address.near", { landmark: booking.address.landmark })}</Typography>}
      {booking.note && (
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          {t("booking.noteShown", { note: booking.note })}
        </Typography>
      )}
    </Box>
  );
}

/** Refund progress, in words (plan W10: the customer sees "processing", never silence). */
export function RefundStatus({ booking }: { booking: BookingDto }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const refund = booking.refund;
  const paid = booking.payment?.status === "captured" || booking.timeline.some((entry) => entry.status === "searching");
  if (!refund && !paid) return <Typography sx={{ color: "text.secondary" }}>{t("refund.nothingCharged")}</Typography>;
  const fee = booking.cancellation?.feePaise ?? 0;
  const amountPaise = refund?.amountPaise ?? Math.max(0, booking.pricing.totalPaise - fee);
  if (amountPaise === 0) return <Typography sx={{ color: "text.secondary" }}>{t("refund.none", { fee: formatMoney(fee, lang) })}</Typography>;
  const status = refund?.status ?? "pending";

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 600 }}>{t("refund.amount", { amount: formatMoney(amountPaise, lang) })}</Typography>
        <Badge tone={status === "processed" ? "success" : status === "failed" ? "danger" : "warning"}>{t(`refund.status.${status}`)}</Badge>
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {status === "processed" ? t("refund.processed", { date: formatDate(new Date(refund?.createdAt ?? booking.createdAt), lang) }) : t(`refund.${status}Body`)}
      </Typography>
      {fee > 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("refund.fee", { fee: formatMoney(fee, lang) })}
        </Typography>
      )}
    </Box>
  );
}

/** "Need help? Call +91 …" (plan Phase 7: help on every booking screen). */
export function HelpLine() {
  const { t } = useTranslation("booking");
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {t("help.text")} <Link href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}>{brand.supportPhone}</Link>
    </Typography>
  );
}
