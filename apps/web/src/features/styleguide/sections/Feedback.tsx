import { useState } from "react";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTranslation } from "react-i18next";
import {
  Banner,
  Button,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  ResponsiveDialog,
  TextField,
  useToast,
} from "@/design-system";
import { formatMoney } from "@/lib/format";
import { Grid, Row, Section, Specimen } from "../parts";

export function Feedback() {
  const { t, i18n } = useTranslation("styleguide");
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const money = (paise: number) => formatMoney(paise, i18n.language);

  return (
    <>
      <Section
        id="feedback"
        title="Feedback"
        description="Inline alerts for messages tied to a place, banners for page-level state, toasts only to confirm a finished background action."
        rules={[
          "Errors say what happened and what to do next. Danger alerts are announced to screen readers immediately.",
          "Toasts never carry errors or anything that needs action. They disappear after 4 seconds.",
          "Destructive actions are confirmed in a dialog that states the consequence.",
        ]}
      >
        <Specimen label="Inline alerts">
          <Box sx={{ display: "grid", gap: 3 }}>
            <InlineAlert tone="success" title={t("samples:checkout.availableTitle")}>
              {t("samples:checkout.arrives", { range: t("common:duration.range", { min: 12, max: 18 }) })}
            </InlineAlert>
            <InlineAlert tone="info">{t("samples:checkout.payNote")}</InlineAlert>
            <InlineAlert tone="warning" title={t("feedback.pricesChangedTitle")}>
              {t("feedback.pricesChangedBody")}
            </InlineAlert>
            <InlineAlert
              tone="danger"
              title={t("feedback.paymentFailedTitle")}
              action={
                <Button variant="secondary" size="sm">
                  {t("common:action.retry")}
                </Button>
              }
            >
              {t("feedback.paymentFailedBody")}
            </InlineAlert>
          </Box>
        </Specimen>
        <Specimen label="Banners (page level)">
          <Box sx={{ display: "grid", gap: 3, mx: { xs: -4, md: -6 } }}>
            <Banner tone="warning">{t("common:state.offline")}</Banner>
            <Banner
              tone="info"
              action={
                <Button variant="tertiary" size="sm">
                  {t("feedback.refresh")}
                </Button>
              }
            >
              {t("feedback.newVersion")}
            </Banner>
            <Banner tone="danger">{t("feedback.paymentsDown")}</Banner>
          </Box>
        </Specimen>
        <Specimen label="Toast and dialogs">
          <Row>
            <Button variant="secondary" onClick={() => toast(t("feedback.addressSaved"))}>
              Show a toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast(t("feedback.bookingCancelled"), { action: { label: t("feedback.undo"), onClick: () => toast(t("feedback.restored")) } })}
            >
              Toast with action
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Confirm a refund
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Dialog (bottom sheet on phones)
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Form dialog (full screen on phones)
            </Button>
          </Row>
        </Specimen>
        <Grid min={300}>
          <Specimen label="Empty state">
            <EmptyState
              headingLevel="h3"
              icon={<EventNoteOutlined />}
              title={t("feedback.noPastTitle")}
              description={t("feedback.noPastBody")}
              action={<Button variant="secondary">{t("feedback.browseServices")}</Button>}
            />
          </Specimen>
          <Specimen label="Skeleton (content loading over 300 ms)">
            <Box sx={{ display: "grid", gap: 4 }}>
              {[0, 1].map((key) => (
                <Box key={key} sx={{ display: "flex", gap: 4 }}>
                  <Skeleton variant="rounded" width={96} height={72} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="70%" />
                    <Skeleton width="40%" />
                    <Skeleton width="30%" />
                  </Box>
                </Box>
              ))}
            </Box>
          </Specimen>
        </Grid>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirming(true);
          window.setTimeout(() => {
            setConfirming(false);
            setConfirmOpen(false);
            toast(t("feedback.refundStarted", { amount: money(104_900) }));
          }, 1200);
        }}
        loading={confirming}
        title={t("feedback.refundTitle")}
        consequence={t("feedback.refundConsequence", { amount: money(104_900) })}
        confirmLabel={t("feedback.refundConfirm", { amount: money(104_900) })}
      />

      <ResponsiveDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("feedback.cancelTitle")}
        description={t("feedback.cancelBody", { fee: money(9_900), refund: money(95_000) })}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              {t("feedback.keepBooking")}
            </Button>
            <Button variant="danger" onClick={() => setSheetOpen(false)}>
              {t("buttons.cancelBooking")}
            </Button>
          </>
        }
      />

      <ResponsiveDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        form
        title={t("feedback.addAddressTitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t("feedback.cancel")}
            </Button>
            <Button onClick={() => setFormOpen(false)}>{t("feedback.saveAddress")}</Button>
          </>
        }
      >
        <Box sx={{ display: "grid", gap: 5 }}>
          <TextField label={t("fields.house")} autoComplete="address-line1" />
          <TextField label={t("fields.building")} autoComplete="address-line2" />
          <TextField label={t("fields.landmark")} optional />
          <TextField label={t("fields.pincode")} inputMode="numeric" autoComplete="postal-code" />
        </Box>
      </ResponsiveDialog>
    </>
  );
}
