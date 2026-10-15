import { useEffect, useState } from "react";
import { type AdminPageDto, type PageContent, pageContentSchema, pagePathSchema, type Section, type SectionType, SECTION_TYPES, z } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useBlocker, useNavigate, useParams } from "react-router";
import { Badge, Button, ConfirmDialog, IconButton, InlineAlert, Link, PageHeader, ResponsiveDialog, SegmentedControl, TextField, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { type EditLang, EditorSection, LocalizedField } from "../catalog/editorFields";
import { adminPageQuery, pageVersionsQuery, useDeletePage, usePublishPage, useResetPage, useRestorePageVersion, useSavePage } from "./api";
import { FieldList, ImageField, PlainField, SwitchField } from "./SectionFields";
import { newSectionId, SECTION_INFO, TONE_OPTIONS } from "./sectionSpecs";
import { STATUS_TONE } from "./status";
import { WebsiteNav } from "./WebsiteNav";

const formSchema = z.object({ path: pagePathSchema, content: pageContentSchema });
type FormValues = { path: string; content: PageContent };
const resolver = standardSchemaResolver(formSchema);

/** /admin/website/pages/:id (ADR-0021): the page builder. */
export function PageEditorPage() {
  const { t } = useTranslation("admin");
  const { id = "" } = useParams();
  const page = useQuery(adminPageQuery(id));

  if (page.isPending) {
    return (
      <Box aria-busy="true" sx={{ display: "grid", gap: 4 }}>
        <Skeleton width="40%" height={48} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  if (page.isError) {
    return (
      <>
        <PageHeader title={t("website.pageMissing")} breadcrumb={<Link to="/admin/website">{t("website.backToPages")}</Link>} />
        <InlineAlert tone="danger">{errorText(t, page.error)}</InlineAlert>
      </>
    );
  }
  return <PageEditor key={page.data.id} initial={page.data} />;
}

function PageEditor({ initial }: { initial: AdminPageDto }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [lang, setLang] = useState<EditLang>("en");
  const [page, setPage] = useState(initial);
  const [formError, setFormError] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);
  const [dialog, setDialog] = useState<"history" | "reset" | "delete" | null>(null);
  const save = useSavePage();
  const publish = usePublishPage();
  const reset = useResetPage();
  const remove = useDeletePage();

  const methods = useForm<FormValues>({ resolver, mode: "onTouched", defaultValues: { path: initial.path, content: initial.content } });
  const { handleSubmit, formState, setError } = methods;
  usePageMeta(t("website.editTitle", { name: initial.title.en }));

  // Unsaved edits are never lost by a stray click; the tab closing is covered by beforeunload.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => formState.isDirty && currentLocation.pathname !== nextLocation.pathname && !(nextLocation.state as { saved?: boolean } | null)?.saved);
  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formState.isDirty]);

  const loaded = (next: AdminPageDto) => {
    setPage(next);
    methods.reset({ path: next.path, content: next.content });
  };

  const failed = (error: unknown) => {
    if (isApiError(error) && error.code === "VERSION_CONFLICT") {
      setConflict(true);
      return;
    }
    if (isApiError(error) && Object.keys(error.fields).length > 0) {
      Object.entries(error.fields).forEach(([path, key], index) => setError(path as never, { type: "server", message: key }, { shouldFocus: index === 0 }));
      if (error.code === "VALIDATION_FAILED") {
        toast(t("website.fixErrors"));
        return;
      }
    }
    setFormError(error);
  };

  /** Saves the draft when it changed; returns the page as the server now has it. */
  const saveDraft = async (values: FormValues): Promise<AdminPageDto | null> => {
    setFormError(null);
    if (!formState.isDirty) return page;
    try {
      const saved = await save.mutateAsync({ id: page.id, input: { version: page.version, path: values.path, content: values.content } });
      loaded(saved);
      return saved;
    } catch (error) {
      failed(error);
      return null;
    }
  };

  const onSave = handleSubmit(async (values) => {
    if (await saveDraft(values)) toast(t("website.draftSaved"));
  }, () => toast(t("website.fixErrors")));

  const onPublish = handleSubmit(async (values) => {
    const saved = await saveDraft(values);
    if (!saved) return;
    try {
      loaded(await publish.mutateAsync({ id: saved.id, version: saved.version }));
      toast(t("website.published"));
    } catch (error) {
      failed(error);
    }
  }, () => toast(t("website.fixErrors")));

  // The preview opens straight away (so the browser allows the new tab) and loads once saved.
  const onPreview = () => {
    const preview = window.open("about:blank", "_blank");
    void handleSubmit(
      async (values) => {
        const saved = await saveDraft(values);
        if (saved && preview) preview.location.href = `${saved.path}?preview=1`;
        else preview?.close();
      },
      () => {
        preview?.close();
        toast(t("website.fixErrors"));
      },
    )();
  };

  const loadLatest = async () => {
    const fresh = await queryClient.fetchQuery({ ...adminPageQuery(page.id), staleTime: 0 });
    loaded(fresh);
    setConflict(false);
    toast(t("website.loadedLatest"));
  };

  const status = formState.isDirty ? "unsaved" : page.status;
  const busy = save.isPending || publish.isPending;

  return (
    <FormProvider {...methods}>
      <PageHeader
        breadcrumb={<Link to="/admin/website">{t("website.backToPages")}</Link>}
        title={page.title.en}
        description={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <span>{page.path}</span>
            <Badge tone={status === "unsaved" ? "info" : STATUS_TONE[page.status]}>{t(`website.status.${status}`)}</Badge>
            {page.publishedAt && <span>{t("website.publishedAt", { date: new Date(page.publishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) })}</span>}
          </Box>
        }
      />
      <WebsiteNav />

      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: tokens.layer.sticky,
          bgcolor: tokens.neutral[50],
          mx: { xs: -4, md: 0 },
          px: { xs: 4, md: 4 },
          py: 3,
          mb: 6,
          borderRadius: { md: `${tokens.radius.md}px` },
          border: `1px solid ${tokens.neutral[200]}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <SegmentedControl
          label={t("editor.language")}
          name="edit-language"
          value={lang}
          onChange={setLang}
          options={[
            { value: "en", label: "English" },
            { value: "hi", label: <span lang="hi">हिन्दी</span> },
          ]}
        />
        <Box sx={{ flex: 1 }} />
        <Button variant="tertiary" size="sm" startIcon={<HistoryOutlined />} onClick={() => setDialog("history")}>
          {t("website.history")}
        </Button>
        <Button variant="secondary" size="sm" startIcon={<VisibilityOutlined />} onClick={onPreview}>
          {t("website.preview")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void onSave()} loading={save.isPending && !publish.isPending} disabled={busy}>
          {t("website.saveDraft")}
        </Button>
        <Button size="sm" onClick={() => void onPublish()} loading={publish.isPending} disabled={busy}>
          {t("website.publish")}
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 4, mb: 6 }}>
        {conflict && (
          <InlineAlert
            tone="warning"
            title={t("website.conflictTitle")}
            action={
              <Button variant="tertiary" size="sm" onClick={() => void loadLatest()}>
                {t("website.loadLatest")}
              </Button>
            }
          >
            {t("website.conflictBody")}
          </InlineAlert>
        )}
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        {lang === "hi" && <InlineAlert tone="info">{t("website.hindiHelp")}</InlineAlert>}
      </Box>

      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 340px" }, alignItems: "start" }}>
        <Sections lang={lang} />
        <Box sx={{ display: "grid", gap: 6, position: { lg: "sticky" }, top: { lg: 88 } }}>
          <EditorSection title={t("website.pageSettings")}>
            <LocalizedField path="content.title" label={t("website.pageTitle")} lang={lang} hint={lang === "en" ? t("website.pageTitleUse") : undefined} />
            {lang === "en" &&
              (page.locked ? (
                <TextField label={t("website.pageAddress")} name="path" value={page.path} disabled hint={t("website.lockedHint")} />
              ) : (
                <TextField label={t("website.pageAddress")} hint={t("website.pageAddressHint")} {...fieldProps(methods.register("path"))} error={methods.formState.errors.path ? t("website.pathInvalid") : undefined} />
              ))}
          </EditorSection>
          <EditorSection title={t("website.seo")} description={t("website.seoHelp")}>
            <LocalizedField path="content.seo.title" label={t("website.seoTitle")} lang={lang} hint={t("website.seoTitleHint")} />
            <LocalizedField path="content.seo.description" label={t("website.seoDescription")} lang={lang} multiline minRows={3} hint={t("website.seoDescriptionHint")} />
            {lang === "en" && <ImageField path="content.seo.image" label={t("website.seoImage")} hint={t("website.seoImageHint")} />}
            {lang === "en" && <SwitchField path="content.seo.noindex" label={t("website.noindex")} hint={t("website.noindexHint")} />}
          </EditorSection>
          <EditorSection title={t("website.more")}>
            {page.hasDefault && (
              <Button variant="secondary" startIcon={<RestartAltOutlined />} onClick={() => setDialog("reset")}>
                {t("website.reset")}
              </Button>
            )}
            {!page.locked && (
              <Button variant="secondary" startIcon={<DeleteOutlineOutlined />} onClick={() => setDialog("delete")} sx={{ color: tokens.semantic.danger.fg }}>
                {t("website.delete")}
              </Button>
            )}
            {page.locked && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("website.lockedHint")}
              </Typography>
            )}
          </EditorSection>
        </Box>
      </Box>

      {dialog === "history" && <HistoryDialog page={page} onClose={() => setDialog(null)} onRestored={(next) => { loaded(next); setDialog(null); toast(t("website.restored")); }} />}
      <ConfirmDialog
        open={dialog === "reset"}
        onClose={() => setDialog(null)}
        title={t("website.resetTitle")}
        consequence={t("website.resetBody")}
        confirmLabel={t("website.reset")}
        loading={reset.isPending}
        onConfirm={() =>
          void reset
            .mutateAsync({ id: page.id, version: page.version })
            .then((next) => {
              loaded(next);
              setDialog(null);
              toast(t("website.resetDone"));
            })
            .catch((error: unknown) => {
              setDialog(null);
              failed(error);
            })
        }
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        tone="danger"
        title={t("website.deleteTitle", { name: page.title.en })}
        consequence={t("website.deleteBody")}
        confirmLabel={t("website.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          void remove
            .mutateAsync(page.id)
            .then(() => {
              methods.reset(methods.getValues());
              toast(t("website.deleted"));
              return navigate("/admin/website", { state: { saved: true } });
            })
            .catch((error: unknown) => {
              setDialog(null);
              setFormError(error);
            })
        }
      />
      <ConfirmDialog
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title={t("website.leaveTitle")}
        consequence={t("website.leaveBody")}
        confirmLabel={t("website.leaveConfirm")}
        cancelLabel={t("website.leaveCancel")}
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
      />
    </FormProvider>
  );
}

/** The page's sections: open one to edit it, reorder, hide, copy, remove, add new ones. */
function Sections({ lang }: { lang: EditLang }) {
  const { t } = useTranslation("admin");
  const { control, getValues } = useFormContext<FormValues>();
  const { fields, insert, remove, move } = useFieldArray({ control, name: "content.sections", keyName: "fieldKey" });
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState<number | null>(null);

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = (type: SectionType, at: number) => {
    const section = SECTION_INFO[type].create();
    insert(at, section);
    setOpen((current) => new Set(current).add(section.id));
    setAdding(null);
  };

  const duplicate = (index: number) => {
    const copy = structuredClone(getValues(`content.sections.${index}`)) as Section;
    copy.id = newSectionId();
    insert(index + 1, copy);
  };

  return (
    <Box component="section" aria-labelledby="sections-title" sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
        <Typography id="sections-title" variant="h2" sx={{ typography: "h3" }}>
          {t("website.sections")}
        </Typography>
        <Button variant="secondary" size="sm" startIcon={<AddOutlined />} onClick={() => setAdding(fields.length)}>
          {t("website.addSection")}
        </Button>
      </Box>
      {fields.length === 0 && <InlineAlert tone="info">{t("website.noSections")}</InlineAlert>}
      {fields.map((field, index) => (
        <SectionCard
          key={field.fieldKey}
          index={index}
          count={fields.length}
          lang={lang}
          expanded={open.has(field.id)}
          onToggle={() => toggle(field.id)}
          onMove={(to) => move(index, to)}
          onDuplicate={() => duplicate(index)}
          onRemove={() => remove(index)}
          onAddBelow={() => setAdding(index + 1)}
        />
      ))}
      {fields.length > 0 && (
        <Button variant="secondary" startIcon={<AddOutlined />} onClick={() => setAdding(fields.length)} sx={{ justifySelf: "start" }}>
          {t("website.addSection")}
        </Button>
      )}
      {adding !== null && <AddSectionDialog onClose={() => setAdding(null)} onPick={(type) => add(type, adding)} />}
    </Box>
  );
}

function SectionCard({
  index,
  count,
  lang,
  expanded,
  onToggle,
  onMove,
  onDuplicate,
  onRemove,
  onAddBelow,
}: {
  index: number;
  count: number;
  lang: EditLang;
  expanded: boolean;
  onToggle: () => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddBelow: () => void;
}) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control, formState } = useFormContext<FormValues>();
  const base = `content.sections.${index}` as const;
  const section = useWatch({ control, name: base }) as Section;
  const [confirm, setConfirm] = useState(false);
  if (!section) return null;
  const info = SECTION_INFO[section.type];
  const summary = info.summary(section);
  const hasErrors = Boolean(formState.errors.content?.sections?.[index]);
  const bodyId = `section-body-${section.id}`;

  return (
    <Box sx={{ border: `1px solid ${hasErrors ? tokens.semantic.danger.fg : tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, bgcolor: tokens.neutral[0], opacity: section.visible ? 1 : 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 2, md: 3 }, py: 2, flexWrap: "wrap" }}>
        <ButtonBase onClick={onToggle} aria-expanded={expanded} aria-controls={bodyId} sx={{ flex: "1 1 220px", minWidth: 0, justifyContent: "flex-start", gap: 2, py: 1, px: 1, borderRadius: `${tokens.radius.sm}px`, textAlign: "left", "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}` } }}>
          {expanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
          <Box sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ display: "block", fontWeight: 600 }}>
              {index + 1}. {info.label}
            </Typography>
            {summary && (
              <Typography variant="body2" component="span" sx={{ display: "block", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {summary}
              </Typography>
            )}
          </Box>
        </ButtonBase>
        {hasErrors && <Badge tone="danger">{t("website.needsFixing")}</Badge>}
        {!section.visible && (
          <Badge tone="neutral" icon={<VisibilityOffOutlined sx={{ fontSize: 14 }} />}>
            {t("website.hidden")}
          </Badge>
        )}
        <Controller
          control={control}
          name={`${base}.visible`}
          render={({ field }) => (
            <IconButton label={field.value ? t("website.hide", { name: info.label }) : t("website.show", { name: info.label })} size="sm" onClick={() => field.onChange(!field.value)}>
              {field.value ? <VisibilityOutlined fontSize="small" /> : <VisibilityOffOutlined fontSize="small" />}
            </IconButton>
          )}
        />
        <IconButton label={t("website.moveUp", { name: info.label })} size="sm" disabled={index === 0} onClick={() => onMove(index - 1)}>
          <ArrowUpwardOutlined fontSize="small" />
        </IconButton>
        <IconButton label={t("website.moveDown", { name: info.label })} size="sm" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
          <ArrowDownwardOutlined fontSize="small" />
        </IconButton>
        <IconButton label={t("website.duplicate", { name: info.label })} size="sm" onClick={onDuplicate}>
          <ContentCopyOutlined fontSize="small" />
        </IconButton>
        <IconButton label={t("website.addBelow")} size="sm" onClick={onAddBelow}>
          <AddOutlined fontSize="small" />
        </IconButton>
        <IconButton label={t("website.removeSection", { name: info.label })} size="sm" onClick={() => setConfirm(true)}>
          <DeleteOutlineOutlined fontSize="small" />
        </IconButton>
      </Box>
      {expanded && (
        <Box id={bodyId} sx={{ borderTop: `1px solid ${tokens.neutral[200]}`, p: { xs: 4, md: 6 }, display: "grid", gap: 5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: -1 }}>
            {info.description}
          </Typography>
          <FieldList fields={info.fields} base={base} lang={lang} />
          {lang === "en" && (
            <Box sx={{ mt: 2, pt: 5, borderTop: `1px dashed ${tokens.neutral[200]}`, display: "grid", gap: 5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <Controller
                control={control}
                name={`${base}.tone`}
                render={({ field }) => (
                  <Box>
                    <Typography variant="label" component="p" sx={{ m: 0, mb: 2 }}>
                      {t("website.background")}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {TONE_OPTIONS.map((option) => (
                        <Button key={option.value} size="sm" variant={field.value === option.value ? "primary" : "secondary"} onClick={() => field.onChange(option.value)} aria-pressed={field.value === option.value}>
                          {option.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              />
              <PlainField path={`${base}.anchor`} label={t("website.anchor")} hint={t("website.anchorHint")} />
            </Box>
          )}
        </Box>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="danger"
        title={t("website.removeTitle", { name: info.label })}
        consequence={t("website.removeBody")}
        confirmLabel={t("website.removeConfirm")}
        onConfirm={() => {
          setConfirm(false);
          onRemove();
        }}
      />
    </Box>
  );
}

function AddSectionDialog({ onClose, onPick }: { onClose: () => void; onPick: (type: SectionType) => void }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  return (
    <ResponsiveDialog open onClose={onClose} maxWidth="md" title={t("website.addSection")} description={t("website.addSectionHelp")}>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        {SECTION_TYPES.map((type) => (
          <li key={type}>
            <ButtonBase
              onClick={() => onPick(type)}
              sx={{
                width: "100%",
                height: "100%",
                display: "block",
                textAlign: "left",
                p: 4,
                borderRadius: `${tokens.radius.md}px`,
                border: `1px solid ${tokens.neutral[200]}`,
                "&:hover": { borderColor: tokens.accent[500], bgcolor: tokens.accent[50] },
                "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{SECTION_INFO[type].label}</Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                {SECTION_INFO[type].description}
              </Typography>
            </ButtonBase>
          </li>
        ))}
      </Box>
    </ResponsiveDialog>
  );
}

/** Published versions, newest first; restoring one puts it live again. */
function HistoryDialog({ page, onClose, onRestored }: { page: AdminPageDto; onClose: () => void; onRestored: (page: AdminPageDto) => void }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const versions = useQuery(pageVersionsQuery(page.id));
  const restore = useRestorePageVersion();
  const [error, setError] = useState<unknown>(null);

  return (
    <ResponsiveDialog open onClose={onClose} title={t("website.historyTitle")} description={t("website.historyHelp")}>
      {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}
      {versions.isPending ? (
        <Skeleton variant="rounded" height={160} />
      ) : (versions.data ?? []).length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>{t("website.historyEmpty")}</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
          {(versions.data ?? []).map((version) => (
            <Box component="li" key={version.number} sx={{ display: "flex", alignItems: "center", gap: 3, p: 3, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{t("website.versionNumber", { number: version.number })}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {new Date(version.publishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {version.publishedBy ? ` · ${version.publishedBy}` : ""}
                </Typography>
              </Box>
              <Button
                size="sm"
                variant="secondary"
                loading={restore.isPending && restore.variables?.number === version.number}
                onClick={() =>
                  void restore
                    .mutateAsync({ id: page.id, number: version.number })
                    .then(onRestored)
                    .catch((failure: unknown) => setError(failure))
                }
              >
                {t("website.restore")}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </ResponsiveDialog>
  );
}

