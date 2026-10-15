import { useState } from "react";
import { type PageSummaryDto, pagePathSchema } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Badge, Button, type Column, DataTable, InlineAlert, Link, PageHeader, ResponsiveDialog, SelectField, TextField } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { adminPagesQuery, useCreatePage } from "./api";
import { STATUS_TONE } from "./status";
import { WebsiteNav } from "./WebsiteNav";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** /admin/website (ADR-0021): every page of the website, with its status; new pages start here. */
export function WebsitePagesPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const pages = useQuery(adminPagesQuery);
  const [creating, setCreating] = useState(false);
  usePageMeta(t("website.pagesTitle"));

  const columns: Column<PageSummaryDto>[] = [
    {
      id: "title",
      header: t("website.colPage"),
      priority: "primary",
      sortValue: (row) => row.title.en.toLowerCase(),
      cell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
            {row.title.en}
          </Typography>
          {row.locked && <LockOutlined sx={{ fontSize: 16, color: "text.secondary" }} titleAccess={t("website.lockedHint")} />}
        </Box>
      ),
    },
    { id: "path", header: t("website.colAddress"), priority: "secondary", nowrap: true, sortValue: (row) => row.path, cell: (row) => row.path },
    { id: "status", header: t("website.colStatus"), priority: "secondary", cell: (row) => <Badge tone={STATUS_TONE[row.status]}>{t(`website.status.${row.status}`)}</Badge> },
    {
      id: "updated",
      header: t("website.colUpdated"),
      priority: "tertiary",
      nowrap: true,
      sortValue: (row) => row.updatedAt,
      cell: (row) => new Date(row.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
    {
      id: "view",
      header: t("website.colView"),
      priority: "tertiary",
      cell: (row) =>
        row.status === "draft" ? null : (
          <Link href={row.path} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()} sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            {t("website.view")} <OpenInNewOutlined sx={{ fontSize: 16 }} />
          </Link>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("website.title")}
        description={t("website.pagesDescription")}
        actions={
          <Button startIcon={<AddOutlined />} onClick={() => setCreating(true)}>
            {t("website.newPage")}
          </Button>
        }
      />
      <WebsiteNav />
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 4 }}>
        <Button startIcon={<AddOutlined />} onClick={() => setCreating(true)} fullWidth>
          {t("website.newPage")}
        </Button>
      </Box>
      {pages.isError ? (
        <InlineAlert tone="danger">{errorText(t, pages.error)}</InlineAlert>
      ) : (
        <DataTable
          caption={t("website.pagesCaption")}
          columns={columns}
          rows={pages.data ?? []}
          getRowId={(row) => row.id}
          loading={pages.isPending}
          onRowClick={(row) => void navigate(`/admin/website/pages/${row.id}`)}
          rowLabel={(row) => t("website.edit", { name: row.title.en })}
          mobileAside={(row) => <Badge tone={STATUS_TONE[row.status]}>{t(`website.status.${row.status}`)}</Badge>}
        />
      )}
      {creating && <NewPageDialog pages={pages.data ?? []} onClose={() => setCreating(false)} />}
    </>
  );
}

function NewPageDialog({ pages, onClose }: { pages: PageSummaryDto[]; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const create = useCreatePage();
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [errors, setErrors] = useState<{ title?: string; path?: string; form?: unknown }>({});
  const address = pathTouched ? path : title ? `/${slugify(title)}` : "";

  const submit = async () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = t("website.titleRequired");
    if (!pagePathSchema.safeParse(address).success || address === "/") next.path = t("website.pathInvalid");
    setErrors(next);
    if (next.title || next.path) return;
    try {
      const page = await create.mutateAsync({ path: address, title: { en: title.trim(), hi: "" }, copyFrom: copyFrom || null });
      await navigate(`/admin/website/pages/${page.id}`);
    } catch (error) {
      if (isApiError(error) && error.fields.path) setErrors({ path: fieldText(t, error.fields.path) });
      else setErrors({ form: error });
    }
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      form
      title={t("website.newPage")}
      description={t("website.newPageDescription")}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("website.cancel")}
          </Button>
          <Button type="submit" form="new-page" loading={create.isPending}>
            {t("website.create")}
          </Button>
        </>
      }
    >
      <Box
        component="form"
        id="new-page"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        sx={{ display: "grid", gap: 5, pt: 1 }}
      >
        {errors.form ? <InlineAlert tone="danger">{errorText(t, errors.form)}</InlineAlert> : null}
        <TextField label={t("website.pageTitle")} name="title" value={title} onChange={(event) => setTitle(event.target.value)} error={errors.title} hint={t("website.pageTitleHint")} />
        <TextField
          label={t("website.pageAddress")}
          name="path"
          value={address}
          onChange={(event) => {
            setPathTouched(true);
            setPath(event.target.value.trim().toLowerCase());
          }}
          error={errors.path}
          hint={t("website.pageAddressHint")}
        />
        <SelectField
          label={t("website.copyFrom")}
          optional
          name="copyFrom"
          value={copyFrom}
          onChange={setCopyFrom}
          options={[{ value: "", label: t("website.startEmpty") }, ...pages.map((page) => ({ value: page.id, label: `${page.title.en} (${page.path})` }))]}
        />
      </Box>
    </ResponsiveDialog>
  );
}
