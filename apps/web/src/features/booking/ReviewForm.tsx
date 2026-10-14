import { useId, useState } from "react";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import StarRounded from "@mui/icons-material/StarRounded";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, InlineAlert, TextField, useToast, VisuallyHidden } from "@/design-system";
import { errorText } from "@/lib/errors";
import { useReview } from "./api";

const STARS = [1, 2, 3, 4, 5] as const;

/** Five native radios drawn as stars: arrow keys, announcements and form semantics come for free. */
function StarRating({ value, onChange, legend, error }: { value: number; onChange: (value: number) => void; legend: string; error?: string }) {
  const { t } = useTranslation("booking");
  const { tokens } = useTheme();
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <Box component="fieldset" aria-describedby={error ? errorId : undefined} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      <Box component="legend" sx={{ typography: "label", p: 0, mb: 2 }}>
        {legend}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        {STARS.map((star) => {
          const filled = star <= value;
          return (
            <Box
              key={star}
              component="label"
              sx={{
                width: 48,
                height: 48,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: `${tokens.radius.sm}px`,
                cursor: "pointer",
                color: filled ? tokens.semantic.warning.strong : tokens.neutral[500],
                "&:has(input:focus-visible)": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
              }}
            >
              <VisuallyHidden component="input" type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} />
              <VisuallyHidden>{t(`review.stars.${star}`)}</VisuallyHidden>
              {filled ? <StarRounded aria-hidden sx={{ fontSize: 36 }} /> : <StarOutlineRounded aria-hidden sx={{ fontSize: 36 }} />}
            </Box>
          );
        })}
      </Box>
      <Typography variant="body2" aria-hidden sx={{ mt: 1, minHeight: 20, color: "text.secondary" }}>
        {value ? t(`review.stars.${value}`) : ""}
      </Typography>
      {error && (
        <Typography id={errorId} variant="body2" role="alert" sx={{ mt: 1, color: "error.main" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

/** "How was your service?" (plan W9): stars and an optional comment, once per booking. */
export function ReviewForm({ bookingId, professionalName }: { bookingId: string; professionalName: string }) {
  const { t } = useTranslation("booking");
  const toast = useToast();
  const review = useReview(bookingId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    if (!rating) {
      setMissing(true);
      return;
    }
    setError(null);
    try {
      await review.mutateAsync({ rating, comment: comment.trim() });
      toast(t("review.thanks"));
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{ display: "grid", gap: 5 }}
    >
      <StarRating
        legend={t("review.legend", { name: professionalName })}
        value={rating}
        onChange={(value) => {
          setRating(value);
          setMissing(false);
        }}
        error={missing ? t("review.ratingRequired") : undefined}
      />
      <TextField
        label={t("review.comment")}
        optional
        hint={t("review.commentHint")}
        multiline
        minRows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 500))}
        name="comment"
      />
      {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}
      <Box>
        <Button type="submit" loading={review.isPending}>
          {t("review.submit")}
        </Button>
      </Box>
    </Box>
  );
}

/** A submitted rating, read-only. */
export function ReviewSummary({ rating, comment }: { rating: number; comment: string }) {
  const { t } = useTranslation("booking");
  const { tokens } = useTheme();
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 0.5, color: tokens.semantic.warning.strong }} aria-hidden>
        {STARS.map((star) => (star <= rating ? <StarRounded key={star} /> : <StarOutlineRounded key={star} sx={{ color: tokens.neutral[400] }} />))}
      </Box>
      <VisuallyHidden>{t("review.yourRating", { count: rating })}</VisuallyHidden>
      {comment && <Typography sx={{ mt: 2 }}>{comment}</Typography>}
    </Box>
  );
}
