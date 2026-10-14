import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { ResponsiveDialog } from "./ResponsiveDialog";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  /** State the consequence plainly, e.g. "Refund ₹1,049 to the customer's UPI. This can't be undone." */
  consequence: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger for destructive actions (cancel, refund, suspend). */
  tone?: "danger" | "primary";
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <ResponsiveDialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={consequence}
      maxWidth="xs"
      showClose={false}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel ?? t("action.keepIt")}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </ResponsiveDialog>
  );
}
