import { type AdminBookingRow, formatIndianMobile } from "@brand/shared";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Button, type Column, DataTable, EmptyState, FilterBar, InlineAlert, PageHeader, Pagination, StatusPill, TextField, useUrlText } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { bookingsExportUrl, bookingsQuery } from "./api";
import { nextParams, rupees, when } from "./format";

const VIEWS = ["active", "searching", "attention", "completed", "cancelled"] as const;

/** /admin/bookings (plan Phase 8): every booking, filterable and searchable, newest first; CSV export. */
export function BookingsPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  usePageMeta(t("bookings.title"));

  const filters = {
    view: params.get("view") ?? "all",
    q: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    page: Number(params.get("page") ?? "1") || 1,
  };
  const bookings = useQuery(bookingsQuery(filters));
  const update = (changes: Record<string, string | null>) => setParams(nextParams({ page: null, ...changes }), { replace: true });
  const fromField = useUrlText(filters.from, (value) => update({ from: value || null }));
  const toField = useUrlText(filters.to, (value) => update({ to: value || null }));

  const columns: Column<AdminBookingRow>[] = [
    {
      id: "number",
      header: t("bookings.colBooking"),
      priority: "primary",
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.number}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            {when(row.createdAt)}
          </Typography>
        </Box>
      ),
    },
    {
      id: "status",
      header: t("bookings.colStatus"),
      priority: "secondary",
      cell: (row) => (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <StatusPill status={row.status} />
          {row.alert && <Badge tone="warning">{t(`alerts.kinds.${row.alert}`)}</Badge>}
          {row.refundStatus === "failed" && <Badge tone="danger">{t("bookings.refundFailed")}</Badge>}
        </Box>
      ),
    },
    {
      id: "customer",
      header: t("bookings.colCustomer"),
      priority: "secondary",
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block" }}>
            {row.customerName}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            {row.customerPhone ? `+91 ${formatIndianMobile(row.customerPhone)}` : ""}
          </Typography>
        </Box>
      ),
    },
    { id: "professional", header: t("bookings.colProfessional"), priority: "tertiary", cell: (row) => row.professionalName ?? "—" },
    { id: "area", header: t("bookings.colArea"), priority: "tertiary", cell: (row) => row.area },
    { id: "total", header: t("bookings.colTotal"), priority: "secondary", align: "right", nowrap: true, cell: (row) => rupees(row.totalPaise) },
  ];

  const data = bookings.data;
  const exportHref = bookingsExportUrl({ view: filters.view, q: filters.q, from: filters.from, to: filters.to });

  return (
    <>
      <PageHeader
        title={t("bookings.title")}
        description={data ? t("bookings.summary", { count: data.total }) : undefined}
        actions={
          <Button variant="secondary" href={exportHref} startIcon={<DownloadOutlined />}>
            {t("bookings.export")}
          </Button>
        }
      />
      <Box sx={{ display: "grid", gap: 5 }}>
        <FilterBar
          searchLabel={t("bookings.search")}
          search={filters.q}
          onSearchChange={(value) => update({ q: value || null })}
          chips={VIEWS.map((view) => ({ id: view, label: t(`bookings.views.${view}`), selected: filters.view === view }))}
          onToggleChip={(id) => update({ view: filters.view === id ? null : id })}
          onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
          extra={
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr 1fr", sm: "180px 180px" } }}>
              <TextField label={t("bookings.from")} type="date" {...fromField} />
              <TextField label={t("bookings.to")} type="date" {...toField} />
            </Box>
          }
        />
        {bookings.isError ? (
          <InlineAlert tone="danger">{errorText(t, bookings.error)}</InlineAlert>
        ) : (
          <DataTable
            caption={t("bookings.caption")}
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            loading={bookings.isPending}
            onRowClick={(row) => void navigate(`/admin/bookings/${row.id}`)}
            rowLabel={(row) => t("bookings.open", { number: row.number })}
            empty={<EmptyState icon={<EventNoteOutlined />} title={t("bookings.emptyTitle")} description={t("bookings.emptyBody")} />}
          />
        )}
        {data && data.total > data.pageSize && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setParams(nextParams({ page: String(page) }), { replace: false })} />}
      </Box>
    </>
  );
}
