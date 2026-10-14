import type { AdminServiceRow } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { ActionBar, Badge, Button, type Column, DataTable, EmptyState, FilterBar, InlineAlert, PageHeader } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { formatDate, formatMoney } from "@/lib/format";
import { adminCategoriesQuery, adminServicesQuery } from "./api";

const CHIPS = ["women", "men", "hidden", "missingHindi"] as const;
type Chip = (typeof CHIPS)[number];

/** /admin/services (plan W13): every service with its price, state and missing translations. */
export function AdminServicesPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const services = useQuery(adminServicesQuery);
  const categories = useQuery(adminCategoriesQuery);
  usePageMeta(t("services.title"));

  const q = params.get("q") ?? "";
  const selected = new Set(CHIPS.filter((chip) => params.get(chip) === "1"));
  // From the address bar, so quick successive changes don't overwrite each other.
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };
  const toggle = (chip: Chip) => {
    const on = !selected.has(chip);
    // Women and men exclude each other.
    const other: Record<string, string | null> = chip === "women" ? { men: null } : chip === "men" ? { women: null } : {};
    update({ [chip]: on ? "1" : null, ...other });
  };

  const categoryName = (slug: string) => categories.data?.find((category) => category.slug === slug)?.name.en ?? slug;
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = (services.data ?? []).filter((row) => {
    if (selected.has("women") && row.gender !== "women") return false;
    if (selected.has("men") && row.gender !== "men") return false;
    if (selected.has("hidden") && row.active) return false;
    if (selected.has("missingHindi") && !row.missingHindi) return false;
    const haystack = `${row.name.en} ${row.name.hi} ${row.slug} ${row.categorySlugs.map(categoryName).join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  const columns: Column<AdminServiceRow>[] = [
    {
      id: "name",
      header: t("services.colName"),
      priority: "primary",
      sortValue: (row) => row.name.en.toLowerCase(),
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.name.en}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            /services/{row.slug}
          </Typography>
        </Box>
      ),
    },
    { id: "category", header: t("services.colCategory"), priority: "secondary", sortValue: (row) => categoryName(row.categorySlugs[0] ?? ""), cell: (row) => row.categorySlugs.map(categoryName).join(", ") },
    {
      id: "price",
      header: t("services.colPrice"),
      priority: "secondary",
      align: "right",
      nowrap: true,
      sortValue: (row) => row.fromPricePaise,
      cell: (row) => (row.tierCount > 1 ? t("services.from", { price: formatMoney(row.fromPricePaise, "en") }) : formatMoney(row.fromPricePaise, "en")),
    },
    { id: "options", header: t("services.colOptions"), priority: "tertiary", align: "right", sortValue: (row) => row.tierCount, cell: (row) => row.tierCount },
    { id: "state", header: t("services.colState"), priority: "tertiary", cell: (row) => <ServiceState row={row} /> },
    { id: "updated", header: t("services.colUpdated"), priority: "tertiary", nowrap: true, sortValue: (row) => row.updatedAt, cell: (row) => formatDate(new Date(row.updatedAt), "en") },
  ];

  return (
    <>
      <PageHeader
        title={t("services.title")}
        description={services.data ? t("services.summary", { count: services.data.length, hidden: services.data.filter((row) => !row.active).length, missing: services.data.filter((row) => row.missingHindi).length }) : undefined}
        actions={
          <Button to="/admin/services/new" startIcon={<AddOutlined />}>
            {t("services.new")}
          </Button>
        }
      />
      <Box sx={{ display: "grid", gap: 5 }}>
        <FilterBar
          searchLabel={t("services.search")}
          search={q}
          onSearchChange={(value) => update({ q: value || null })}
          chips={CHIPS.map((chip) => ({ id: chip, label: t(`services.chips.${chip}`), selected: selected.has(chip) }))}
          onToggleChip={(id) => toggle(id as Chip)}
          onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
        />
        {services.isError ? (
          <InlineAlert
            tone="danger"
            action={
              <Button variant="tertiary" size="sm" onClick={() => void services.refetch()}>
                {t("common:action.retry")}
              </Button>
            }
          >
            {t("services.loadError")}
          </InlineAlert>
        ) : (
          <DataTable
            caption={t("services.caption")}
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            loading={services.isPending}
            onRowClick={(row) => void navigate(`/admin/services/${row.id}/edit`)}
            rowLabel={(row) => t("services.open", { name: row.name.en })}
            mobileAside={(row) => <ServiceState row={row} />}
            empty={<EmptyState title={t("services.emptyTitle")} description={t("services.emptyBody")} />}
          />
        )}
      </Box>
      <ActionBar>
        <Button to="/admin/services/new" size="lg" fullWidth startIcon={<AddOutlined />}>
          {t("services.new")}
        </Button>
      </ActionBar>
    </>
  );
}

function ServiceState({ row }: { row: AdminServiceRow }) {
  const { t } = useTranslation("admin");
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {row.active ? <Badge tone="success">{t("services.active")}</Badge> : <Badge>{t("services.hidden")}</Badge>}
      {row.missingHindi && <Badge tone="warning">{t("services.missingHindi")}</Badge>}
    </Box>
  );
}
