import { useState } from "react";
import { CUSTOMER_CANCEL_REASONS } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, InlineAlert, RadioCards, useToast } from "@/design-system";
import { errorText } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { cancelPreviewQuery, useCancelBooking } from "./api";

type Reason = (typeof CUSTOMER_CANCEL_REASONS)[number];

/**
 * Cancel with the consequence spelled out first (plan W10): the fee, if any, and what comes
 * back. The server decides both; this only shows its preview.
 */
export function CancelBookingDialog({ bookingId, professionalName, onClose }: { bookingId: string; professionalName: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation("booking");
  const lang = i18n.language;
  const toast = useToast();
  const preview = useQuery(cancelPreviewQuery(bookingId));
  const cancel = useCancelBooking(bookingId);
  const [reason, setReason] = useState<Reason | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [missingReason, setMissingReason] = useState(false);

  const data = preview.data;
  const consequence = preview.isPending ? (
    <Skeleton variant="text" width="80%" />
  ) : !data ? (
    t("cancel.previewError")
  ) : !data.allowed ? (
    t("cancel.notAllowed")
  ) : (
    t(`cancel.basis.${data.basis}`, { fee: formatMoney(data.feePaise, lang), refund: formatMoney(data.refundPaise, lang), name: professionalName ?? t("cancel.yourProfessional") })
  );

  const confirm = async () => {
    if (!data?.allowed) return onClose();
    if (!reason) {
      setMissingReason(true);
      return;
    }
    setError(null);
    try {
      await cancel.mutateAsync(reason);
      toast(t("cancel.done"));
      onClose();
    } catch (failure) {
      setError(failure);
      void preview.refetch();
    }
  };

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("cancel.title")}
      consequence={consequence}
      confirmLabel={data && !data.allowed ? t("cancel.close") : t("cancel.confirm")}
      cancelLabel={t("cancel.keep")}
      loading={cancel.isPending}
    >
      {data?.allowed ? (
        <Box sx={{ display: "grid", gap: 4 }}>
          <RadioCards<Reason>
            legend={t("cancel.reasonLegend")}
            name="cancel-reason"
            value={reason}
            onChange={(value) => {
              setReason(value);
              setMissingReason(false);
            }}
            options={CUSTOMER_CANCEL_REASONS.map((value) => ({ value, label: t(`cancel.reasons.${value}`) }))}
          />
          {missingReason && <InlineAlert tone="danger">{t("cancel.reasonRequired")}</InlineAlert>}
          {data.refundPaise > 0 && <InlineAlert tone="info">{t("cancel.refundTiming")}</InlineAlert>}
          {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}
        </Box>
      ) : null}
    </ConfirmDialog>
  );
}
