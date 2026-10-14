import { type AdminProfessionalRow, formatIndianMobile, SKILL_LABELS } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { ActionBar, Badge, Button, type Column, DataTable, EmptyState, FilterBar, InlineAlert, PageHeader } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatRelativeFromNow } from "@/lib/format";
import { adminProfessionalsQuery } from "./api";
import { PresenceBadge } from "./PresenceBadge";

const CHIPS = ["online", "unverified", "suspended"] as const;
type Chip = (typeof CHIPS)[number];

/** /admin/professionals (plan Phase 4): who is online now, who is waiting for verification. */
export function AdminProfessionalsPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const professionals = useQuery(adminProfessionalsQuery);
  usePageMeta(t("professionals.title"));

  const q = params.get("q") ?? "";
  const selected = new Set(CHIPS.filter((chip) => params.get(chip) === "1"));
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = professionals.data ?? [];
  const rows = all.filter((row) => {
    if (selected.has("online") && row.presence.state === "offline") return false;
    if (selected.has("unverified") && row.verifiedAt) return false;
    if (selected.has("suspended") && row.status !== "suspended") return false;
    const haystack = `${row.name} ${row.phone} ${row.email} ${row.baseArea}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const online = all.filter((row) => row.presence.state !== "offline").length;

  const columns: Column<AdminProfessionalRow>[] = [
    {
      id: "name",
      header: t("professionals.colName"),
      priority: "primary",
      sortValue: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: 600, color: "text.primary" }}>
            {row.name}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            +91 {formatIndianMobile(row.phone)} · {row.baseArea}
          </Typography>
        </Box>
      ),
    },
    { id: "skills", header: t("professionals.colSkills"), priority: "secondary", cell: (row) => row.skills.map((skill) => SKILL_LABELS[skill].en.split(" (")[0]).join(", ") },
    {
      id: "presence",
      header: t("professionals.colPresence"),
      priority: "secondary",
      sortValue: (row) => ["available", "busy", "stale", "offline"].indexOf(row.presence.state),
      cell: (row) => (
        <Box>
          <PresenceBadge presence={row.presence} />
          {row.presence.lastHeartbeatAt && (
            <Typography variant="caption" component="span" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
              {t("professionals.lastSeen", { time: formatRelativeFromNow(new Date(row.presence.lastHeartbeatAt), "en") })}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: "account",
      header: t("professionals.colAccount"),
      priority: "tertiary",
      cell: (row) => (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {row.status === "suspended" ? <Badge tone="danger">{t("professionals.suspended")}</Badge> : row.verifiedAt ? <Badge tone="success">{t("professionals.verified")}</Badge> : <Badge tone="warning">{t("professionals.unverified")}</Badge>}
          {!row.lastLoginAt && <Badge>{t("professionals.neverLoggedIn")}</Badge>}
        </Box>
      ),
    },
    { id: "devices", header: t("professionals.colDevices"), priority: "tertiary", align: "right", sortValue: (row) => row.devices, cell: (row) => row.devices },
  ];

  return (
    <>
      <PageHeader
        title={t("professionals.title")}
        description={professionals.data ? t("professionals.summary", { count: all.length, online }) : undefined}
        actions={
          <Button to="/admin/professionals/new" startIcon={<AddOutlined />}>
            {t("professionals.new")}
          </Button>
        }
      />
      <Box sx={{ display: "grid", gap: 5 }}>
        <FilterBar
          searchLabel={t("professionals.search")}
          search={q}
          onSearchChange={(value) => update({ q: value || null })}
          chips={CHIPS.map((chip) => ({ id: chip, label: t(`professionals.chips.${chip}`), selected: selected.has(chip) }))}
          onToggleChip={(id) => update({ [id]: selected.has(id as Chip) ? null : "1" })}
          onClearAll={() => setParams(new URLSearchParams(), { replace: true })}
        />
        {professionals.isError ? (
          <InlineAlert tone="danger">{errorText(t, professionals.error)}</InlineAlert>
        ) : (
          <DataTable
            caption={t("professionals.caption")}
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            loading={professionals.isPending}
            onRowClick={(row) => void navigate(`/admin/professionals/${row.id}`)}
            rowLabel={(row) => t("professionals.open", { name: row.name })}
            mobileAside={(row) => <PresenceBadge presence={row.presence} />}
            empty={
              <EmptyState
                title={all.length === 0 ? t("professionals.emptyTitle") : t("professionals.noMatchTitle")}
                description={all.length === 0 ? t("professionals.emptyBody") : t("professionals.noMatchBody")}
                action={
                  all.length === 0 ? (
                    <Button to="/admin/professionals/new" startIcon={<AddOutlined />}>
                      {t("professionals.new")}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </Box>
      <ActionBar>
        <Button to="/admin/professionals/new" size="lg" fullWidth startIcon={<AddOutlined />}>
          {t("professionals.new")}
        </Button>
      </ActionBar>
    </>
  );
}
