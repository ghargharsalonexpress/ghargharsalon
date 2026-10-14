import { useState } from "react";
import { formatIndianMobile, pick } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Badge, Button, ConfirmDialog, EmptyState, InlineAlert, Link, PageHeader, StatusPill, TextField, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { customerQuery, useCustomerStatus } from "./api";
import { rupees, when } from "./format";
import { Field, Section } from "./parts";

/** /admin/customers/:id (plan Phase 8): who they are, what they booked, and block or unblock. */
export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const customer = useQuery(customerQuery(id));
  const status = useCustomerStatus(id);
  const [confirming, setConfirming] = useState(false);
  // Fixed when the dialog opens, so its words don't flip while it closes after the change.
  const [action, setAction] = useState<"block" | "unblock">("block");
  const [reason, setReason] = useState("");
  usePageMeta(customer.data?.customer.name ?? t("customers.title"));

  if (customer.isError && !customer.data) {
    return <EmptyState headingLevel="h1" title={t("customers.notFoundTitle")} description={errorText(t, customer.error)} action={<Button to="/admin/customers">{t("customers.backToList")}</Button>} />;
  }
  const d = customer.data;
  if (!d) {
    return (
      <Box aria-busy sx={{ display: "grid", gap: 4 }}>
        <Skeleton width={280} height={40} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  const blocked = d.customer.status === "blocked";
  const unblocking = action === "unblock";
  const button = (
    <Button
      variant={blocked ? "secondary" : "danger"}
      onClick={() => {
        setAction(blocked ? "unblock" : "block");
        setConfirming(true);
      }}
    >
      {blocked ? t("customers.unblock") : t("customers.block")}
    </Button>
  );

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/admin/customers" standalone>
            {t("customers.backToList")}
          </Link>
        }
        title={d.customer.name}
        description={blocked ? <Badge tone="danger">{t("customers.blocked")}</Badge> : t("customers.since", { date: when(d.customer.createdAt) })}
        actions={button}
      />
      <Box sx={{ display: { xs: "flex", md: "none" }, mb: 6 }}>{button}</Box>

      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 3fr)" }, alignItems: "start" }}>
        <Section id="customer-profile" title={t("customers.profile")}>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 3 }}>
            <Field label={t("customers.colPhone")}>
              <Link href={`tel:+91${d.customer.phone}`}>+91 {formatIndianMobile(d.customer.phone)}</Link>
            </Field>
            <Field label={t("customers.email")}>
              <Link href={`mailto:${d.customer.email}`}>{d.customer.email}</Link>
            </Field>
            <Field label={t("customers.language")}>{d.customer.locale === "hi" ? "Hindi" : "English"}</Field>
            <Field label={t("customers.spent")}>{rupees(d.spentPaise)}</Field>
          </Box>
        </Section>

        <Section id="customer-bookings" title={t("customers.bookings", { count: d.bookings.length })}>
          {d.bookings.length === 0 ? (
            <Typography sx={{ color: "text.secondary" }}>{t("customers.noBookings")}</Typography>
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {d.bookings.map((booking, index) => (
                <Box
                  component="li"
                  key={booking.id}
                  sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center", py: 3, borderTop: index === 0 ? 0 : `1px solid ${tokens.neutral[200]}` }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Link to={`/admin/bookings/${booking.id}`}>{booking.number}</Link>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {[when(booking.createdAt), booking.items.map((item) => pick(item.name, "en")).join(", "), rupees(booking.totalPaise)].join(" · ")}
                    </Typography>
                  </Box>
                  <StatusPill status={booking.status} />
                </Box>
              ))}
            </Box>
          )}
        </Section>
      </Box>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          if (reason.trim().length < 3) return;
          status.mutate(
            { status: unblocking ? "active" : "blocked", reason: reason.trim() },
            {
              onSuccess: () => {
                toast(unblocking ? t("customers.unblocked", { name: d.customer.name }) : t("customers.blockedToast", { name: d.customer.name }));
                setConfirming(false);
                setReason("");
              },
            },
          );
        }}
        loading={status.isPending}
        tone={unblocking ? "primary" : "danger"}
        title={unblocking ? t("customers.unblockTitle", { name: d.customer.name }) : t("customers.blockTitle", { name: d.customer.name })}
        consequence={unblocking ? t("customers.unblockBody") : t("customers.blockBody")}
        confirmLabel={unblocking ? t("customers.unblock") : t("customers.block")}
      >
        <Box sx={{ display: "grid", gap: 3 }}>
          <TextField label={t("customers.reason")} hint={t("customers.reasonHint")} value={reason} onChange={(event) => setReason(event.target.value.slice(0, 300))} name="reason" />
          {status.isError ? <InlineAlert tone="danger">{errorText(t, status.error)}</InlineAlert> : null}
        </Box>
      </ConfirmDialog>
    </>
  );
}
