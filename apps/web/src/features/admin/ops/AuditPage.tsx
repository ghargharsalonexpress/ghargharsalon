import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { ChoiceChips, EmptyState, InlineAlert, Link, PageHeader, Pagination } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { auditQuery } from "./api";
import { nextParams, when } from "./format";

const AREAS = ["booking", "refund", "payment", "customer", "professional", "review", "settings", "service", "category"] as const;

/** Where an entity lives in the console, when it has a page. */
function entityLink(type: string, id: string): string | null {
  if (type === "booking" && /^[a-f0-9]{24}$/.test(id)) return `/admin/bookings/${id}`;
  if (type === "user" && /^[a-f0-9]{24}$/.test(id)) return null;
  return null;
}

/** /admin/audit (plan C11, Phase 8): who changed what and when, with the values before and after. */
export function AuditPage() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const [params, setParams] = useSearchParams();
  usePageMeta(t("audit.title"));
  const area = (params.get("area") ?? "") as (typeof AREAS)[number] | "";
  const page = Number(params.get("page") ?? "1") || 1;
  // Actions are dotted ("booking.refund"), so an area filters by its prefix.
  const audit = useQuery(auditQuery({ action: area, entityType: "", entityId: params.get("entityId") ?? "", page }));
  const data = audit.data;

  return (
    <>
      <PageHeader title={t("audit.title")} description={t("audit.description")} />
      <Box sx={{ display: "grid", gap: 5 }}>
        <ChoiceChips label={t("audit.filter")} options={AREAS.map((id) => ({ id, label: t(`audit.areas.${id}`) }))} value={area || null} onChange={(id) => setParams(nextParams({ area: id, page: null }), { replace: true })} />
        {audit.isError ? (
          <InlineAlert tone="danger">{errorText(t, audit.error)}</InlineAlert>
        ) : !data ? (
          <Box aria-busy sx={{ display: "grid", gap: 3 }}>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={64} />
          </Box>
        ) : data.rows.length === 0 ? (
          <Box sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
            <EmptyState icon={<HistoryOutlined />} title={t("audit.emptyTitle")} description={t("audit.emptyBody")} />
          </Box>
        ) : (
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
            {data.rows.map((row, index) => {
              const link = entityLink(row.entity.type, row.entity.id);
              const hasValues = row.before !== null || row.after !== null;
              return (
                <Box component="li" key={row.id} sx={{ px: 5, py: 4, borderTop: index === 0 ? 0 : `1px solid ${tokens.neutral[200]}` }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{t(`audit.actions.${row.action}`, { defaultValue: row.action })}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {when(row.at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                    {row.actorName || t("audit.system")} · {row.entity.type}{" "}
                    {link ? <Link to={link}>{row.entity.id}</Link> : <Box component="span" sx={{ overflowWrap: "anywhere" }}>{row.entity.id}</Box>}
                  </Typography>
                  {hasValues && (
                    <Box component="details" sx={{ mt: 2, "& summary": { cursor: "pointer", color: tokens.accent[700], typography: "body2" } }}>
                      <summary>{t("audit.showValues")}</summary>
                      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 2 }}>
                        {(["before", "after"] as const).map((key) => (
                          <Box key={key} sx={{ minWidth: 0 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {t(`audit.${key}`)}
                            </Typography>
                            <Box
                              component="pre"
                              sx={{ m: 0, mt: 1, p: 3, bgcolor: tokens.neutral[50], borderRadius: `${tokens.radius.sm}px`, typography: "caption", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 280 }}
                            >
                              {row[key] === null ? "—" : JSON.stringify(row[key], null, 2)}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        {data && data.total > data.pageSize && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(next) => setParams(nextParams({ page: String(next) }))} />}
      </Box>
    </>
  );
}
