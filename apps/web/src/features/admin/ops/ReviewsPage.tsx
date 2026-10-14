import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Badge, Button, ChoiceChips, EmptyState, InlineAlert, Link, PageHeader, Pagination, useToast, VisuallyHidden } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { reviewsQuery, useReviewVisibility } from "./api";
import { nextParams, when } from "./format";

const FILTERS = ["1", "2", "3", "4", "5", "hidden"] as const;

/** /admin/reviews (plan Phase 8): read what customers said; hide an abusive review (the rating follows). */
export function ReviewsPage() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  usePageMeta(t("reviews.title"));
  const filter = params.get("filter") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;
  const reviews = useQuery(reviewsQuery({ rating: filter === "hidden" ? "" : filter, hidden: filter === "hidden" ? "1" : "", page }));
  const visibility = useReviewVisibility();
  const data = reviews.data;

  return (
    <>
      <PageHeader title={t("reviews.title")} description={t("reviews.description")} />
      <Box sx={{ display: "grid", gap: 5 }}>
        <ChoiceChips
          label={t("reviews.filter")}
          options={FILTERS.map((value) => ({ id: value, label: value === "hidden" ? t("reviews.hiddenOnly") : t("reviews.stars", { count: Number(value) }) }))}
          value={filter || null}
          onChange={(id) => setParams(nextParams({ filter: id, page: null }), { replace: true })}
        />
        {visibility.isError && <InlineAlert tone="danger">{errorText(t, visibility.error)}</InlineAlert>}
        {reviews.isError ? (
          <InlineAlert tone="danger">{errorText(t, reviews.error)}</InlineAlert>
        ) : !data ? (
          <Box aria-busy sx={{ display: "grid", gap: 3 }}>
            <Skeleton variant="rounded" height={96} />
            <Skeleton variant="rounded" height={96} />
          </Box>
        ) : data.rows.length === 0 ? (
          <Box sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
            <EmptyState icon={<StarOutlineRounded />} title={t("reviews.emptyTitle")} description={t("reviews.emptyBody")} />
          </Box>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
            {data.rows.map((review) => (
              <Box
                component="li"
                key={review.bookingId}
                sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: 5, display: "grid", gap: 2, opacity: review.hidden ? 0.75 : 1 }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box aria-hidden sx={{ display: "flex", color: tokens.semantic.warning.strong }}>
                      {[1, 2, 3, 4, 5].map((star) => (star <= review.rating ? <StarRounded key={star} sx={{ fontSize: 20 }} /> : <StarOutlineRounded key={star} sx={{ fontSize: 20, color: tokens.neutral[400] }} />))}
                    </Box>
                    <VisuallyHidden>{t("reviews.ratedLabel", { count: review.rating })}</VisuallyHidden>
                    {review.hidden && <Badge>{t("reviews.hidden")}</Badge>}
                  </Box>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={visibility.isPending && visibility.variables?.bookingId === review.bookingId}
                    onClick={() => visibility.mutate({ bookingId: review.bookingId, hidden: !review.hidden }, { onSuccess: () => toast(review.hidden ? t("reviews.shownToast") : t("reviews.hiddenToast")) })}
                  >
                    {review.hidden ? t("reviews.show") : t("reviews.hide")}
                  </Button>
                </Box>
                <Typography sx={{ whiteSpace: "pre-line" }}>{review.comment || t("reviews.noComment")}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  <Link to={`/admin/bookings/${review.bookingId}`}>{review.bookingNumber}</Link> · {t("reviews.byFor", { customer: review.customerName, professional: review.professionalName ?? "—" })} · {when(review.at)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {data && data.total > data.pageSize && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => setParams(nextParams({ page: String(next) }))} />}
      </Box>
    </>
  );
}
