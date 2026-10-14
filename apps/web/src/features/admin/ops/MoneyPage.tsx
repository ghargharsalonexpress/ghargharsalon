import type { AdminPaymentRow, AdminRefundRow } from "@brand/shared";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, type BadgeTone, Button, ChoiceChips, type Column, DataTable, EmptyState, InlineAlert, PageHeader, Pagination, TabPanel, Tabs, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { paymentsQuery, refundsQuery, useRetryRefund } from "./api";
import { nextParams, rupeesExact, when } from "./format";

type View = "payments" | "refunds";
const PAYMENT_TONE: Record<string, BadgeTone> = { captured: "success", created: "neutral", failed: "danger", refunded: "warning" };
const REFUND_TONE: Record<string, BadgeTone> = { processed: "success", queued: "info", pending: "warning", failed: "danger" };

/** /admin/payments (plan Phase 8): every payment and refund; a failed refund is retried from here. */
export function MoneyPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  usePageMeta(t("money.title"));
  const view: View = params.get("view") === "refunds" ? "refunds" : "payments";
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;
  const payments = useQuery({ ...paymentsQuery({ status, page }), enabled: view === "payments" });
  const refunds = useQuery({ ...refundsQuery({ status, page }), enabled: view === "refunds" });
  const retry = useRetryRefund();

  const paymentColumns: Column<AdminPaymentRow>[] = [
    {
      id: "booking",
      header: t("money.colBooking"),
      priority: "primary",
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.bookingNumber}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary", overflowWrap: "anywhere" }}>
            {row.paymentId ?? row.orderId}
          </Typography>
        </Box>
      ),
    },
    { id: "amount", header: t("money.colAmount"), priority: "secondary", align: "right", nowrap: true, cell: (row) => rupeesExact(row.amountPaise) },
    { id: "status", header: t("money.colStatus"), priority: "secondary", cell: (row) => <Badge tone={PAYMENT_TONE[row.status] ?? "neutral"}>{t(`money.paymentStatus.${row.status}`, { defaultValue: row.status })}</Badge> },
    { id: "method", header: t("money.colMethod"), priority: "tertiary", cell: (row) => (row.method ? row.method.toUpperCase() : "—") },
    { id: "when", header: t("money.colWhen"), priority: "tertiary", cell: (row) => when(row.capturedAt ?? row.createdAt) },
  ];

  const refundColumns: Column<AdminRefundRow>[] = [
    {
      id: "booking",
      header: t("money.colBooking"),
      priority: "primary",
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.bookingNumber}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            {[row.reason.replace(/^admin:\d+:/, ""), t(`money.by.${row.initiatedBy}`, { defaultValue: row.initiatedBy })].join(" · ")}
          </Typography>
        </Box>
      ),
    },
    { id: "amount", header: t("money.colAmount"), priority: "secondary", align: "right", nowrap: true, cell: (row) => rupeesExact(row.amountPaise) },
    {
      id: "status",
      header: t("money.colStatus"),
      priority: "secondary",
      cell: (row) => (
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone={REFUND_TONE[row.status] ?? "neutral"}>{t(`money.refundStatus.${row.status}`)}</Badge>
          {row.status === "failed" && (
            <Button
              variant="secondary"
              size="sm"
              loading={retry.isPending && retry.variables === row.id}
              onClick={(event) => {
                // The row opens the booking; this button only retries.
                event.stopPropagation();
                retry.mutate(row.id, { onSuccess: () => toast(t("money.retried")) });
              }}
            >
              {t("money.retry")}
            </Button>
          )}
        </Box>
      ),
    },
    { id: "when", header: t("money.colWhen"), priority: "tertiary", cell: (row) => when(row.processedAt ?? row.createdAt) },
    { id: "error", header: t("money.colError"), priority: "tertiary", cell: (row) => row.lastError ?? "" },
  ];

  const statuses = view === "payments" ? ["captured", "failed", "refunded", "created"] : ["failed", "queued", "pending", "processed"];
  const current = view === "payments" ? payments : refunds;
  const data = current.data;

  return (
    <>
      <PageHeader title={t("money.title")} description={t("money.description")} />
      <Box sx={{ display: "grid", gap: 5 }}>
        <Tabs<View>
          idPrefix="money"
          label={t("money.title")}
          value={view}
          onChange={(next) => setParams(nextParams({ view: next === "payments" ? null : next, status: null, page: null }), { replace: true })}
          items={[
            { value: "payments", label: t("money.payments") },
            { value: "refunds", label: t("money.refunds") },
          ]}
        />
        <TabPanel idPrefix="money" value={view} current={view}>
          <Box sx={{ display: "grid", gap: 5 }}>
            <ChoiceChips
              label={t("money.filterStatus")}
              options={statuses.map((value) => ({ id: value, label: view === "payments" ? t(`money.paymentStatus.${value}`) : t(`money.refundStatus.${value}`) }))}
              value={status || null}
              onChange={(id) => setParams(nextParams({ status: id, page: null }), { replace: true })}
            />
            {retry.isError && <InlineAlert tone="danger">{errorText(t, retry.error)}</InlineAlert>}
            {current.isError ? (
              <InlineAlert tone="danger">{errorText(t, current.error)}</InlineAlert>
            ) : view === "payments" ? (
              <DataTable
                caption={t("money.paymentsCaption")}
                columns={paymentColumns}
                rows={payments.data?.rows ?? []}
                getRowId={(row) => row.id}
                loading={payments.isPending}
                onRowClick={(row) => void navigate(`/admin/bookings/${row.bookingId}`)}
                rowLabel={(row) => t("money.openBooking", { number: row.bookingNumber })}
                empty={<EmptyState icon={<PaymentsOutlined />} title={t("money.emptyPayments")} description={t("money.emptyBody")} />}
              />
            ) : (
              <DataTable
                caption={t("money.refundsCaption")}
                columns={refundColumns}
                rows={refunds.data?.rows ?? []}
                getRowId={(row) => row.id}
                loading={refunds.isPending}
                onRowClick={(row) => void navigate(`/admin/bookings/${row.bookingId}`)}
                rowLabel={(row) => t("money.openBooking", { number: row.bookingNumber })}
                empty={<EmptyState icon={<PaymentsOutlined />} title={t("money.emptyRefunds")} description={t("money.emptyBody")} />}
              />
            )}
            {data && data.total > data.pageSize && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => setParams(nextParams({ page: String(next) }))} />}
          </Box>
        </TabPanel>
      </Box>
    </>
  );
}
