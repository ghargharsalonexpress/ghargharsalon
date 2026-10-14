import { type AdminCustomerRow, formatIndianMobile } from "@brand/shared";
import PeopleOutlineOutlined from "@mui/icons-material/PeopleOutlineOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, type Column, DataTable, EmptyState, FilterBar, InlineAlert, PageHeader, Pagination } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { customersQuery } from "./api";
import { nextParams, when } from "./format";

/** /admin/customers (plan Phase 8): find a customer by name, email or phone; see who is blocked. */
export function CustomersPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  usePageMeta(t("customers.title"));
  const filters = { q: params.get("q") ?? "", status: params.get("status") ?? "", page: Number(params.get("page") ?? "1") || 1 };
  const customers = useQuery(customersQuery(filters));
  const update = (changes: Record<string, string | null>) => setParams(nextParams({ page: null, ...changes }), { replace: true });

  const columns: Column<AdminCustomerRow>[] = [
    {
      id: "name",
      header: t("customers.colName"),
      priority: "primary",
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.name}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary", overflowWrap: "anywhere" }}>
            {row.email}
          </Typography>
        </Box>
      ),
    },
    { id: "phone", header: t("customers.colPhone"), priority: "secondary", nowrap: true, cell: (row) => `+91 ${formatIndianMobile(row.phone)}` },
    { id: "bookings", header: t("customers.colBookings"), priority: "secondary", align: "right", cell: (row) => row.bookings },
    { id: "last", header: t("customers.colLast"), priority: "tertiary", cell: (row) => (row.lastBookingAt ? when(row.lastBookingAt) : "—") },
    { id: "status", header: t("customers.colStatus"), priority: "tertiary", cell: (row) => (row.status === "blocked" ? <Badge tone="danger">{t("customers.blocked")}</Badge> : <Badge>{t("customers.active")}</Badge>) },
  ];

  const data = customers.data;
  return (
    <>
      <PageHeader title={t("customers.title")} description={data ? t("customers.summary", { count: data.total }) : undefined} />
      <Box sx={{ display: "grid", gap: 5 }}>
        <FilterBar
          searchLabel={t("customers.search")}
          search={filters.q}
          onSearchChange={(value) => update({ q: value || null })}
          chips={[{ id: "blocked", label: t("customers.onlyBlocked"), selected: filters.status === "blocked" }]}
          onToggleChip={() => update({ status: filters.status === "blocked" ? null : "blocked" })}
          onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
        />
        {customers.isError ? (
          <InlineAlert tone="danger">{errorText(t, customers.error)}</InlineAlert>
        ) : (
          <DataTable
            caption={t("customers.caption")}
            columns={columns}
            rows={data?.rows ?? []}
            getRowId={(row) => row.id}
            loading={customers.isPending}
            onRowClick={(row) => void navigate(`/admin/customers/${row.id}`)}
            rowLabel={(row) => t("customers.open", { name: row.name })}
            mobileAside={(row) => (row.status === "blocked" ? <Badge tone="danger">{t("customers.blocked")}</Badge> : null)}
            empty={<EmptyState icon={<PeopleOutlineOutlined />} title={t("customers.emptyTitle")} description={t("customers.emptyBody")} />}
          />
        )}
        {data && data.total > data.pageSize && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setParams(nextParams({ page: String(page) }))} />}
      </Box>
    </>
  );
}
