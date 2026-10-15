import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { COLOR_PRESETS, CORNER_STYLES, DEFAULT_SITE_CONFIG, type SiteConfig, siteConfigSchema, SITE_FONTS, type SiteFont, type SiteConfigResponse } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Skeleton from "@mui/material/Skeleton";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router";
import { Badge, Button, ConfirmDialog, createAppTheme, InlineAlert, Link, PageHeader, ResponsiveDialog, SegmentedControl, SelectField, TextField, useToast } from "@/design-system";
import { accentAdjusted, accentRampFromHex } from "@/design-system/foundations/accent";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { loadSiteFont, siteFontStack } from "@/lib/fonts";
import { type EditLang, EditorSection } from "../catalog/editorFields";
import { adminSiteQuery, siteVersionsQuery, useRestoreSite, useSaveSite } from "./api";
import { FieldList } from "./SectionFields";
import { AREA_GROUPS, type SettingsArea } from "./siteSpecs";
import { WebsiteNav } from "./WebsiteNav";

const resolver = standardSchemaResolver(siteConfigSchema);
const FALLBACK_ACCENT = DEFAULT_SITE_CONFIG.theme.accent;

export const BrandSettingsPage = () => <SiteSettingsPage area="brand" />;
export const MenusSettingsPage = () => <SiteSettingsPage area="menus" />;
export const SeoSettingsPage = () => <SiteSettingsPage area="seo" />;

/** /admin/website/brand, /menus and /seo (ADR-0021): the site-wide settings, one versioned document. */
function SiteSettingsPage({ area }: { area: SettingsArea }) {
  const { t } = useTranslation("admin");
  const site = useQuery(adminSiteQuery);
  usePageMeta(t(`website.nav.${area}`));

  if (site.isPending) {
    return (
      <Box aria-busy="true" sx={{ display: "grid", gap: 4 }}>
        <Skeleton width="40%" height={48} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  if (site.isError) return <InlineAlert tone="danger">{errorText(t, site.error)}</InlineAlert>;
  return <SiteSettingsForm key={`${area}-${site.data.version}`} area={area} initial={site.data} />;
}

function SiteSettingsForm({ area, initial }: { area: SettingsArea; initial: SiteConfigResponse }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const queryClient = useQueryClient();
  const save = useSaveSite();
  const [lang, setLang] = useState<EditLang>("en");
  const [version, setVersion] = useState(initial.version);
  const [formError, setFormError] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState(false);
  const methods = useForm<SiteConfig>({ resolver, mode: "onTouched", defaultValues: initial.site });
  const { formState, handleSubmit, setError } = methods;

  const blocker = useBlocker(({ currentLocation, nextLocation }) => formState.isDirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formState.isDirty]);

  const onSubmit = handleSubmit(
    async (site) => {
      setFormError(null);
      try {
        const saved = await save.mutateAsync({ version, site });
        setVersion(saved.version);
        methods.reset(saved.site);
        toast(t("website.siteSaved"));
      } catch (error) {
        if (isApiError(error) && error.code === "VERSION_CONFLICT") {
          setConflict(true);
          return;
        }
        if (isApiError(error) && Object.keys(error.fields).length > 0) {
          Object.entries(error.fields).forEach(([path, key], index) => setError(path.replace(/^site\./, "") as never, { type: "server", message: key }, { shouldFocus: index === 0 }));
          if (error.code === "VALIDATION_FAILED") return;
        }
        setFormError(error);
      }
    },
    () => toast(t("website.fixErrors")),
  );

  const loadLatest = async () => {
    const fresh = await queryClient.fetchQuery({ ...adminSiteQuery, staleTime: 0 });
    setVersion(fresh.version);
    methods.reset(fresh.site);
    setConflict(false);
  };

  return (
    <FormProvider {...methods}>
      <PageHeader title={t("website.title")} description={t(`website.${area}Description`)} />
      <WebsiteNav />
      <Box component="form" noValidate onSubmit={onSubmit}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 6 }}>
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
          {formState.isDirty && <Badge tone="info">{t("website.status.unsaved")}</Badge>}
          <Button variant="tertiary" size="sm" startIcon={<HistoryOutlined />} onClick={() => setHistory(true)}>
            {t("website.history")}
          </Button>
          <Button type="submit" size="sm" loading={save.isPending}>
            {t("website.saveSite")}
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
          {area === "brand" && <MissingLegal />}
          {area === "seo" && (
            <InlineAlert tone="info">
              {t("website.areasHelp")} <Link to="/admin/settings">{t("website.areasLink")}</Link>
            </InlineAlert>
          )}
        </Box>

        <Box sx={{ display: "grid", gap: 6, maxWidth: 880 }}>
          {area === "brand" && lang === "en" && <ThemeEditor />}
          {AREA_GROUPS[area].map((group) => (
            <EditorSection key={group.title} title={group.title} description={group.description}>
              <FieldList fields={group.fields} base="" lang={lang} />
            </EditorSection>
          ))}
          <Box>
            <Button type="submit" loading={save.isPending}>
              {t("website.saveSite")}
            </Button>
          </Box>
        </Box>
      </Box>

      {history && (
        <SiteHistoryDialog
          version={version}
          onClose={() => setHistory(false)}
          onRestored={(saved) => {
            setVersion(saved.version);
            methods.reset(saved.site);
            setHistory(false);
            toast(t("website.restored"));
          }}
        />
      )}
      <ConfirmDialog
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title={t("website.leaveTitle")}
        consequence={t("website.leaveSiteBody")}
        confirmLabel={t("website.leaveConfirm")}
        cancelLabel={t("website.leaveCancel")}
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
      />
    </FormProvider>
  );
}

/** A reminder until the legal details the policies quote are filled in. */
function MissingLegal() {
  const { t } = useTranslation("admin");
  const brand = useWatch<SiteConfig, "brand">({ name: "brand" });
  const missing = [!brand.legalName && t("website.legalName"), !brand.grievanceOfficer && t("website.grievanceOfficer"), !brand.jurisdiction && t("website.jurisdiction")].filter(Boolean);
  if (missing.length === 0) return null;
  return <InlineAlert tone="warning" title={t("website.legalMissingTitle")}>{t("website.legalMissingBody", { fields: missing.join(", ") })}</InlineAlert>;
}

/** Colour, fonts and corners, with a live preview in the chosen theme. */
function ThemeEditor() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control, setValue } = useFormContext<SiteConfig>();
  const theme = useWatch({ control, name: "theme" });
  const valid = /^#[0-9a-fA-F]{6}$/.test(theme.accent);

  useEffect(() => {
    loadSiteFont(theme.headingFont);
    loadSiteFont(theme.bodyFont);
  }, [theme.headingFont, theme.bodyFont]);

  const preview = useMemo(
    () => createAppTheme({ accent: accentRampFromHex(valid ? theme.accent : FALLBACK_ACCENT), corners: theme.corners, headingFamily: siteFontStack(theme.headingFont), bodyFamily: siteFontStack(theme.bodyFont) }),
    [theme.accent, theme.corners, theme.headingFont, theme.bodyFont, valid],
  );
  const fonts = Object.entries(SITE_FONTS) as Array<[SiteFont, (typeof SITE_FONTS)[SiteFont]]>;

  return (
    <EditorSection title={t("website.theme")} description={t("website.themeHelp")}>
      <Box>
        <Typography variant="label" component="p" sx={{ m: 0, mb: 3 }}>
          {t("website.colour")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {COLOR_PRESETS.map((preset) => {
            const selected = theme.accent.toLowerCase() === preset.hex.toLowerCase();
            return (
              <ButtonBase
                key={preset.id}
                onClick={() => setValue("theme.accent", preset.hex, { shouldDirty: true, shouldValidate: true })}
                aria-pressed={selected}
                aria-label={preset.label}
                sx={{ display: "grid", justifyItems: "center", gap: 1, p: 1, borderRadius: `${tokens.radius.md}px`, "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}` } }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: preset.hex, display: "grid", placeItems: "center", color: tokens.neutral[0], boxShadow: selected ? `0 0 0 3px ${tokens.neutral[0]}, 0 0 0 5px ${preset.hex}` : "none" }}>
                  {selected && <CheckOutlined fontSize="small" />}
                </Box>
                <Typography variant="caption">{preset.label}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
      <Controller
        control={control}
        name="theme.accent"
        render={({ field, fieldState }) => (
          <Box sx={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 3, alignItems: "end" }}>
            <Box
              component="input"
              type="color"
              aria-label={t("website.pickColour")}
              value={valid ? field.value : FALLBACK_ACCENT}
              onChange={(event: ChangeEvent<HTMLInputElement>) => field.onChange(event.target.value.toUpperCase())}
              sx={{ width: 56, height: 48, p: 0, border: 0, bgcolor: "transparent", cursor: "pointer" }}
            />
            <TextField
              label={t("website.customColour")}
              hint={valid && accentAdjusted(field.value) ? t("website.colourAdjusted") : t("website.colourHint")}
              name={field.name}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value.trim())}
              onBlur={field.onBlur}
              error={fieldState.error ? t("website.colourInvalid") : undefined}
            />
          </Box>
        )}
      />
      <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <Controller
          control={control}
          name="theme.headingFont"
          render={({ field }) => <SelectField label={t("website.headingFont")} name={field.name} value={field.value} onChange={field.onChange} options={fonts.map(([value, font]) => ({ value, label: font.label }))} />}
        />
        <Controller
          control={control}
          name="theme.bodyFont"
          render={({ field }) => <SelectField label={t("website.bodyFont")} name={field.name} value={field.value} onChange={field.onChange} options={fonts.filter(([, font]) => font.body).map(([value, font]) => ({ value, label: font.label }))} />}
        />
      </Box>
      <Controller
        control={control}
        name="theme.corners"
        render={({ field }) => (
          <SegmentedControl
            label={t("website.corners")}
            showLabel
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            options={CORNER_STYLES.map((value) => ({ value, label: t(`website.cornerStyle.${value}`) }))}
          />
        )}
      />
      <ThemeProvider theme={preview}>
        <ThemePreview />
      </ThemeProvider>
    </EditorSection>
  );
}

function ThemePreview() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  return (
    <Box aria-label={t("website.preview")} role="group" sx={{ p: { xs: 4, md: 6 }, borderRadius: `${tokens.radius.lg}px`, border: `1px solid ${tokens.neutral[200]}`, bgcolor: tokens.accent[50], display: "grid", gap: 3 }}>
      <Typography variant="label" component="p" sx={{ m: 0, color: tokens.accent[700], textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {t("website.previewEyebrow")}
      </Typography>
      <Typography variant="h2" component="p" sx={{ m: 0 }}>
        {t("website.previewTitle")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>{t("website.previewBody")}</Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Button>{t("website.previewPrimary")}</Button>
        <Button variant="secondary">{t("website.previewSecondary")}</Button>
        <Badge tone="accentSolid">{t("website.previewBadge")}</Badge>
      </Box>
    </Box>
  );
}

function SiteHistoryDialog({ version, onClose, onRestored }: { version: number; onClose: () => void; onRestored: (saved: SiteConfigResponse) => void }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const versions = useQuery(siteVersionsQuery);
  const restore = useRestoreSite();
  const [error, setError] = useState<unknown>(null);
  return (
    <ResponsiveDialog open onClose={onClose} title={t("website.siteHistoryTitle")} description={t("website.siteHistoryHelp")}>
      {error ? <InlineAlert tone="danger">{errorText(t, error)}</InlineAlert> : null}
      {versions.isPending ? (
        <Skeleton variant="rounded" height={160} />
      ) : (versions.data ?? []).length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>{t("website.historyEmpty")}</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
          {(versions.data ?? []).map((row) => (
            <Box component="li" key={row.version} sx={{ display: "flex", alignItems: "center", gap: 3, p: 3, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {t("website.versionNumber", { number: row.version })}
                  {row.version === version ? ` · ${t("website.current")}` : ""}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {new Date(row.changedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {row.changedBy ? ` · ${row.changedBy}` : ""}
                </Typography>
              </Box>
              {row.version !== version && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={restore.isPending && restore.variables?.restore === row.version}
                  onClick={() =>
                    void restore
                      .mutateAsync({ restore: row.version, version })
                      .then(onRestored)
                      .catch((failure: unknown) => setError(failure))
                  }
                >
                  {t("website.restore")}
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}
    </ResponsiveDialog>
  );
}
