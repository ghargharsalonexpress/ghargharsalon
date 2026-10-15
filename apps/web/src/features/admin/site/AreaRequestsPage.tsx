import { useState } from "react";
import { type AreaRequestDto, formatIndianMobile } from "@brand/shared";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { type Column, ConfirmDialog, DataTable, EmptyState, IconButton, InlineAlert, Link, PageHeader, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { areaRequestsQuery, useDeleteAreaRequest } from "./api";
import { WebsiteNav } from "./WebsiteNav";

/** /admin/website/requests (ADR-0021): visitors outside the service areas who asked to be told. */
export function AreaRequestsPage() {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const requests = useQuery(areaRequestsQuery);
  const remove = useDeleteAreaRequest();
  const [deleting, setDeleting] = useState<AreaRequestDto | null>(null);
  usePageMeta(t("website.nav.requests"));

  const columns: Column<AreaRequestDto>[] = [
    { id: "phone", header: t("website.colPhone"), priority: "primary", nowrap: true, cell: (row) => <Link href={`tel:+91${row.phone}`}>+91 {formatIndianMobile(row.phone)}</Link> },
    { id: "place", header: t("website.colPlace"), priority: "secondary", sortValue: (row) => row.place.toLowerCase(), cell: (row) => row.place || "—" },
    {
      id: "map",
      header: t("website.colMap"),
      priority: "secondary",
      cell: (row) =>
        row.location ? (
          <Link href={`https://www.google.com/maps?q=${row.location.lat},${row.location.lng}`}>{t("website.openMap")}</Link>
        ) : (
          "—"
        ),
    },
    { id: "when", header: t("website.colReceived"), priority: "tertiary", nowrap: true, sortValue: (row) => row.createdAt, cell: (row) => new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
    {
      id: "delete",
      header: t("website.colActions"),
      priority: "tertiary",
      cell: (row) => (
        <IconButton label={t("website.deleteRequest", { phone: row.phone })} size="sm" onClick={() => setDeleting(row)}>
          <DeleteOutlineOutlined fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("website.title")} description={t("website.requestsDescription")} />
      <WebsiteNav />
      {requests.isError ? (
        <InlineAlert tone="danger">{errorText(t, requests.error)}</InlineAlert>
      ) : (
        <DataTable
          caption={t("website.requestsCaption")}
          columns={columns}
          rows={requests.data ?? []}
          getRowId={(row) => row.id}
          loading={requests.isPending}
          empty={<EmptyState title={t("website.requestsEmptyTitle")} description={t("website.requestsEmptyBody")} />}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        tone="danger"
        title={t("website.deleteRequestTitle")}
        consequence={t("website.deleteRequestBody")}
        confirmLabel={t("website.delete")}
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, {
            onSuccess: () => toast(t("website.requestDeleted")),
            onError: (error) => toast(errorText(t, error)),
            onSettled: () => setDeleting(null),
          });
        }}
      />
    </>
  );
}
