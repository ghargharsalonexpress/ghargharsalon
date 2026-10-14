import { useState } from "react";
import { CONTACT_STATUSES, type ContactMessageDto, type ContactStatus, formatIndianMobile } from "@brand/shared";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Badge, type BadgeTone, Button, type Column, DataTable, EmptyState, InlineAlert, Link, PageHeader, ResponsiveDialog, SegmentedControl, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";

const messagesQuery = queryOptions({
  queryKey: ["admin", "messages"] as const,
  queryFn: () => api.get<ContactMessageDto[]>("/v1/admin/messages"),
});

const TONE: Record<ContactStatus, BadgeTone> = { new: "info", replied: "success", closed: "neutral" };
type Filter = ContactStatus | "all";

/** /admin/messages (plan W17): the contact form inbox, newest first. */
export function AdminMessagesPage() {
  const { t } = useTranslation("admin");
  const [params, setParams] = useSearchParams();
  const messages = useQuery(messagesQuery);
  const [open, setOpen] = useState<ContactMessageDto | null>(null);
  usePageMeta(t("messages.title"));

  const filter: Filter = CONTACT_STATUSES.find((status) => status === params.get("status")) ?? "all";
  const rows = (messages.data ?? []).filter((message) => filter === "all" || message.status === filter);
  const unread = messages.data?.filter((message) => message.status === "new").length ?? 0;

  const columns: Column<ContactMessageDto>[] = [
    {
      id: "from",
      header: t("messages.colFrom"),
      priority: "primary",
      sortValue: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <Box>
          <Typography variant="body2" component="span" sx={{ display: "block", fontWeight: row.status === "new" ? 600 : 400, color: "text.primary" }}>
            {row.name}
          </Typography>
          <Typography variant="caption" component="span" sx={{ display: "block", color: "text.secondary" }}>
            {row.email}
          </Typography>
        </Box>
      ),
    },
    {
      id: "message",
      header: t("messages.colMessage"),
      priority: "secondary",
      cell: (row) => (row.message.length > 120 ? `${row.message.slice(0, 117)}…` : row.message),
    },
    {
      id: "received",
      header: t("messages.colReceived"),
      priority: "secondary",
      nowrap: true,
      sortValue: (row) => row.createdAt,
      cell: (row) => new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
    { id: "status", header: t("messages.colStatus"), priority: "tertiary", cell: (row) => <Badge tone={TONE[row.status]}>{t(`messages.status.${row.status}`)}</Badge> },
  ];

  return (
    <>
      <PageHeader title={t("messages.title")} description={messages.data ? t("messages.summary", { count: unread }) : undefined} />
      <Box sx={{ display: "grid", gap: 5 }}>
        <Box sx={{ overflowX: "auto" }}>
          <SegmentedControl<Filter>
            label={t("messages.filter")}
            name="message-status"
            value={filter}
            onChange={(value) => setParams(value === "all" ? {} : { status: value }, { replace: true })}
            options={[{ value: "all", label: t("messages.all") }, ...CONTACT_STATUSES.map((status) => ({ value: status, label: t(`messages.status.${status}`) }))]}
          />
        </Box>
        {messages.isError ? (
          <InlineAlert tone="danger">{errorText(t, messages.error)}</InlineAlert>
        ) : (
          <DataTable
            caption={t("messages.caption")}
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            loading={messages.isPending}
            onRowClick={setOpen}
            rowLabel={(row) => t("messages.open", { name: row.name })}
            mobileAside={(row) => <Badge tone={TONE[row.status]}>{t(`messages.status.${row.status}`)}</Badge>}
            empty={<EmptyState title={t("messages.emptyTitle")} description={t("messages.emptyBody")} />}
          />
        )}
      </Box>
      {open && <MessageDialog message={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function MessageDialog({ message, onClose }: { message: ContactMessageDto; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ContactStatus>(message.status);
  const update = useMutation({
    mutationFn: (next: ContactStatus) => api.patch<ContactMessageDto>(`/v1/admin/messages/${message.id}`, { status: next }),
    onSuccess: (saved) => {
      queryClient.setQueryData(messagesQuery.queryKey, (list: ContactMessageDto[] | undefined) => list?.map((item) => (item.id === saved.id ? saved : item)));
      toast(t("messages.updated", { status: t(`messages.status.${saved.status}`) }));
    },
  });

  const subject = encodeURIComponent(t("messages.replySubject"));
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      maxWidth="sm"
      title={t("messages.from", { name: message.name })}
      description={new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("messages.close")}
          </Button>
          <Button href={`mailto:${message.email}?subject=${subject}`}>{t("messages.reply")}</Button>
        </>
      }
    >
      <Box sx={{ display: "grid", gap: 5 }}>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{message.message}</Typography>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 4, rowGap: 1 }}>
          <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
            {t("messages.email")}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0 }}>
            <Link href={`mailto:${message.email}`}>{message.email}</Link>
          </Typography>
          {message.phone && (
            <>
              <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
                {t("messages.phone")}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                <Link href={`tel:+91${message.phone}`}>+91 {formatIndianMobile(message.phone)}</Link>
              </Typography>
            </>
          )}
        </Box>
        {update.isError && <InlineAlert tone="danger">{errorText(t, update.error)}</InlineAlert>}
        <SegmentedControl<ContactStatus>
          label={t("messages.colStatus")}
          showLabel
          name="message-status-edit"
          value={status}
          onChange={(next) => {
            setStatus(next);
            update.mutate(next, { onError: () => setStatus(message.status) });
          }}
          options={CONTACT_STATUSES.map((value) => ({ value, label: t(`messages.status.${value}`) }))}
        />
      </Box>
    </ResponsiveDialog>
  );
}
