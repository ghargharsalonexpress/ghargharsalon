import { useEffect, useState } from "react";
import {
  type CategoryDto,
  hasMissingHindi,
  type ServiceDto,
  type ServiceInput,
  serviceInputSchema,
  SKILL_LABELS,
} from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Controller,
  FormProvider,
  get,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useBlocker, useNavigate, useParams } from "react-router";
import {
  ActionBar,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  IconButton,
  InlineAlert,
  Link,
  PageHeader,
  SegmentedControl,
  Switch,
  TextField,
  useToast,
} from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import {
  adminCategoriesQuery,
  adminServiceQuery,
  adminServicesQuery,
  useSaveService,
} from "./api";
import {
  CountField,
  type EditLang,
  EditorSection,
  ImagesEditor,
  LocalizedField,
  MoneyField,
  TextListEditor,
} from "./editorFields";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const schemaResolver = standardSchemaResolver(serviceInputSchema);

const blank = (order: number): ServiceInput => ({
  slug: "",
  gender: "women",
  categorySlugs: [],
  filterSlugs: [],
  name: { en: "", hi: "" },
  summary: { en: "", hi: "" },
  overview: [],
  thingsToKnow: [],
  aftercare: [],
  recommendedFor: [],
  products: [],
  faq: [],
  tiers: [
    {
      id: "standard",
      label: { en: "Standard", hi: "स्टैंडर्ड" },
      pricePaise: 0,
      compareAtPaise: null,
      durationMin: 30,
      sessions: 1,
    },
  ],
  requiredSkills: [],
  images: [],
  // New services start hidden, so nothing half-written reaches customers.
  active: false,
  order,
});

function toInput(service: ServiceDto): ServiceInput {
  const {
    id: _id,
    version: _version,
    updatedAt: _updatedAt,
    ...input
  } = service;
  return input;
}

/**
 * What the form doesn't ask for directly: the web address from the name when left empty,
 * option ids from their names, and the skills that follow from the categories. Applied
 * before validation, so the checks and the save both see the finished service.
 */
function prepare(
  values: ServiceInput,
  categories: CategoryDto[],
): ServiceInput {
  const used = new Set<string>();
  const tiers = values.tiers.map((tier, index) => {
    let tierId = tier.id || slugify(tier.label.en) || `option-${index + 1}`;
    while (used.has(tierId)) tierId = `${tierId}-${index + 1}`;
    used.add(tierId);
    return { ...tier, id: tierId };
  });
  const skills = values.categorySlugs
    .map((slug) => categories.find((category) => category.slug === slug)?.skill)
    .filter((skill) => skill !== undefined);
  return {
    ...values,
    slug: values.slug || slugify(values.name.en),
    tiers,
    requiredSkills: [...new Set(skills)],
  };
}

/** Filters that no longer exist in the chosen categories are dropped, or the API would refuse the save. */
function withKnownFilters(
  input: ServiceInput,
  categories: CategoryDto[],
): ServiceInput {
  const allowed = new Set(
    categories
      .filter((category) => input.categorySlugs.includes(category.slug))
      .flatMap((category) => category.filters.map((filter) => filter.slug)),
  );
  return {
    ...input,
    filterSlugs: input.filterSlugs.filter((slug) => allowed.has(slug)),
  };
}

/** /admin/services/new and /admin/services/:id/edit (plan W13). */
export function ServiceEditorPage() {
  const { id } = useParams();
  const { t } = useTranslation("admin");
  const existing = useQuery({
    ...adminServiceQuery(id ?? "new"),
    enabled: Boolean(id),
  });
  const categories = useQuery(adminCategoriesQuery);
  const services = useQuery(adminServicesQuery);

  if (id && existing.isError) {
    const missing =
      isApiError(existing.error) && existing.error.code === "NOT_FOUND";
    return (
      <EmptyState
        headingLevel="h1"
        title={missing ? t("editor.notFoundTitle") : t("editor.loadErrorTitle")}
        description={
          missing ? t("editor.notFoundBody") : errorText(t, existing.error)
        }
        action={<Button to="/admin/services">{t("editor.backToList")}</Button>}
      />
    );
  }
  if ((id && !existing.data) || !categories.data) return <EditorSkeleton />;

  return (
    <ServiceEditor
      key={id ?? "new"}
      id={id ?? null}
      initial={existing.data ?? null}
      categories={categories.data}
      nextOrder={services.data?.length ?? 0}
    />
  );
}

function EditorSkeleton() {
  return (
    <Box aria-busy sx={{ display: "grid", gap: 4 }}>
      <Skeleton width={280} height={40} />
      <Skeleton variant="rounded" height={220} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  );
}

function ServiceEditor({
  id,
  initial,
  categories,
  nextOrder,
}: {
  id: string | null;
  initial: ServiceDto | null;
  categories: CategoryDto[];
  nextOrder: number;
}) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const save = useSaveService();
  const [lang, setLang] = useState<EditLang>("en");
  const [version, setVersion] = useState(initial?.version ?? 0);
  const [formError, setFormError] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);

  const methods = useForm<ServiceInput>({
    resolver: (values, context, options) =>
      schemaResolver(prepare(values, categories), context, options),
    mode: "onTouched",
    defaultValues: initial
      ? withKnownFilters(toInput(initial), categories)
      : blank(nextOrder),
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState,
  } = methods;
  const name = useWatch({ control, name: "name.en" });
  const slug = useWatch({ control, name: "slug" });
  const active = useWatch({ control, name: "active" });

  usePageMeta(initial ? initial.name.en : t("editor.newTitle"));

  // Unsaved edits are never lost by a stray click (the tab closing is covered by beforeunload).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      formState.isDirty &&
      currentLocation.pathname !== nextLocation.pathname &&
      !(nextLocation.state as { saved?: boolean } | null)?.saved,
  );
  useEffect(() => {
    if (!formState.isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formState.isDirty]);

  // `service` has been through prepare() by the resolver.
  const onSubmit = handleSubmit(async (service) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({ id, version, service });
      setVersion(saved.version);
      reset(withKnownFilters(toInput(saved), categories));
      toast(id ? t("editor.saved") : t("editor.created"));
      // The saved flag tells the unsaved-changes guard this navigation is the save itself.
      if (!id)
        await navigate(`/admin/services/${saved.id}/edit`, {
          replace: true,
          state: { saved: true },
        });
    } catch (error) {
      if (isApiError(error) && error.code === "VERSION_CONFLICT") {
        setConflict(true);
        return;
      }
      if (isApiError(error) && Object.keys(error.fields).length > 0) {
        Object.entries(error.fields).forEach(([path, key], index) =>
          setError(
            path as never,
            { type: "server", message: key },
            { shouldFocus: index === 0 },
          ),
        );
        if (error.code === "VALIDATION_FAILED") return;
      }
      setFormError(error);
    }
  });

  // After a version conflict: replace the form with what is saved now (this person's edits are dropped, as the dialog says).
  const loadTheirs = async () => {
    if (!id) return;
    const fresh = await queryClient.fetchQuery({
      ...adminServiceQuery(id),
      staleTime: 0,
    });
    setVersion(fresh.version);
    reset(withKnownFilters(toInput(fresh), categories));
    setConflict(false);
    toast(t("editor.loadedTheirs"));
  };

  const errorCount = Object.keys(formState.errors).length;

  return (
    <FormProvider {...methods}>
      <Box component="form" noValidate onSubmit={onSubmit}>
        <PageHeader
          breadcrumb={
            <Link to="/admin/services" standalone>
              {t("editor.backToList")}
            </Link>
          }
          title={initial ? initial.name.en : t("editor.newTitle")}
          description={
            initial
              ? t("editor.lastSaved", {
                  date: new Date(initial.updatedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("editor.newDescription")
          }
          actions={
            id && active && slug ? (
              <Button
                variant="secondary"
                href={`/services/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("editor.preview")}
              </Button>
            ) : undefined
          }
        />

        <Box sx={{ display: "grid", gap: 4, mb: 6 }}>
          {formError ? (
            <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert>
          ) : null}
          {errorCount > 0 && formState.isSubmitted ? (
            <InlineAlert tone="danger">{t("editor.fixErrors")}</InlineAlert>
          ) : null}
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 1fr) 340px",
            },
            alignItems: "start",
          }}
        >
          <Box sx={{ display: "grid", gap: 6 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              <SegmentedControl
                label={t("editor.language")}
                showLabel
                name="edit-language"
                value={lang}
                onChange={setLang}
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: <span lang="hi">हिन्दी</span> },
                ]}
              />
              <MissingHindi />
            </Box>

            <EditorSection title={t("editor.basics")}>
              <LocalizedField
                path="name"
                label={t("editor.name")}
                lang={lang}
              />
              <LocalizedField
                path="summary"
                label={t("editor.summary")}
                lang={lang}
                multiline
                minRows={2}
                hint={t("editor.summaryHint")}
              />
              {lang === "en" && (
                <TextField
                  label={t("editor.slug")}
                  hint={t("editor.slugHint")}
                  startAdornment={
                    <Typography
                      component="span"
                      sx={{ color: "text.secondary", whiteSpace: "nowrap" }}
                    >
                      /services/
                    </Typography>
                  }
                  {...fieldProps(register("slug"))}
                  // An empty address is suggested from the name; anything typed is kept.
                  onFocus={() => {
                    if (!slug && name)
                      setValue("slug", slugify(name), { shouldDirty: true });
                  }}
                  error={fieldText(
                    t,
                    get(formState.errors, "slug")?.message as
                      string | undefined,
                  )}
                />
              )}
            </EditorSection>

            <TiersEditor lang={lang} />
            <OverviewEditor lang={lang} />
            <TextListEditor
              name="thingsToKnow"
              label={t("editor.thingsToKnow")}
              itemLabel={t("editor.point")}
              lang={lang}
              max={15}
            />
            <TextListEditor
              name="aftercare"
              label={t("editor.aftercare")}
              itemLabel={t("editor.point")}
              lang={lang}
              max={15}
            />
            <TextListEditor
              name="recommendedFor"
              label={t("editor.recommendedFor")}
              itemLabel={t("editor.point")}
              lang={lang}
              max={10}
            />
            <TextListEditor
              name="products"
              label={t("editor.products")}
              itemLabel={t("editor.product")}
              lang={lang}
              max={10}
            />
            <FaqEditor lang={lang} />
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 6,
              position: { lg: "sticky" },
              top: { lg: 80 },
            }}
          >
            <EditorSection title={t("editor.visibility")}>
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Switch
                    label={t("editor.active")}
                    description={
                      field.value ? t("editor.activeOn") : t("editor.activeOff")
                    }
                    checked={field.value}
                    onChange={field.onChange}
                    name={field.name}
                  />
                )}
              />
            </EditorSection>
            <PlacementEditor categories={categories} />
            <EditorSection
              title={t("editor.photos")}
              description={t("editor.photosDescription")}
            >
              <ImagesEditor
                name="images"
                folder="services"
                max={6}
                label={t("editor.photo")}
              />
            </EditorSection>
          </Box>
        </Box>

        <ActionBar always>
          <Typography
            variant="body2"
            sx={{ flex: 1, color: "text.secondary" }}
            aria-live="polite"
          >
            {formState.isDirty ? t("editor.unsaved") : t("editor.allSaved")}
          </Typography>
          <Button type="submit" loading={save.isPending}>
            {id ? t("editor.save") : t("editor.create")}
          </Button>
        </ActionBar>
      </Box>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title={t("editor.leaveTitle")}
        consequence={t("editor.leaveBody")}
        confirmLabel={t("editor.leaveConfirm")}
        cancelLabel={t("editor.leaveCancel")}
      />
      <ConfirmDialog
        open={conflict}
        onClose={() => setConflict(false)}
        onConfirm={() => void loadTheirs()}
        tone="primary"
        title={t("editor.conflictTitle")}
        consequence={t("editor.conflictBody")}
        confirmLabel={t("editor.conflictConfirm")}
        cancelLabel={t("editor.conflictCancel")}
      />
    </FormProvider>
  );
}

/** "Hindi missing" while any English text has no Hindi yet; saving is still allowed (plan W13). */
function MissingHindi() {
  const { t } = useTranslation("admin");
  const values = useWatch();
  return hasMissingHindi(values) ? (
    <Badge tone="warning">{t("editor.missingHindi")}</Badge>
  ) : (
    <Badge tone="success">{t("editor.hindiComplete")}</Badge>
  );
}

function TiersEditor({ lang }: { lang: EditLang }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const {
    control,
    formState: { errors },
  } = useFormContext<ServiceInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });
  const rootError = get(errors, "tiers")?.message as string | undefined;

  return (
    <EditorSection
      title={t("editor.tiers")}
      description={t("editor.tiersDescription")}
      action={
        <Button
          variant="secondary"
          size="sm"
          startIcon={<AddOutlined />}
          disabled={fields.length >= 8}
          onClick={() =>
            append({
              id: "",
              label: { en: "", hi: "" },
              pricePaise: 0,
              compareAtPaise: null,
              durationMin: 30,
              sessions: 1,
            })
          }
        >
          {t("editor.addTier")}
        </Button>
      }
    >
      {rootError && (
        <InlineAlert tone="danger">{fieldText(t, rootError)}</InlineAlert>
      )}
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            border: `1px solid ${tokens.neutral[200]}`,
            borderRadius: `${tokens.radius.md}px`,
            p: 4,
            display: "grid",
            gap: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="label" component="h3" sx={{ m: 0 }}>
              {t("editor.tierN", { n: index + 1 })}
            </Typography>
            <IconButton
              label={t("editor.removeTier", { n: index + 1 })}
              size="sm"
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Box>
          <LocalizedField
            path={`tiers.${index}.label`}
            label={t("editor.tierLabel")}
            lang={lang}
            hint={t("editor.tierLabelHint")}
          />
          <Box
            sx={{
              display: "grid",
              gap: 4,
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <MoneyField
              name={`tiers.${index}.pricePaise`}
              label={t("editor.price")}
            />
            <MoneyField
              name={`tiers.${index}.compareAtPaise`}
              label={t("editor.compareAt")}
              optional
            />
            <CountField
              name={`tiers.${index}.durationMin`}
              label={t("editor.duration")}
              suffix={t("editor.min")}
            />
            <CountField
              name={`tiers.${index}.sessions`}
              label={t("editor.sessions")}
            />
          </Box>
        </Box>
      ))}
    </EditorSection>
  );
}

function OverviewEditor({ lang }: { lang: EditLang }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control } = useFormContext<ServiceInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "overview",
  });
  return (
    <EditorSection
      title={t("editor.includes")}
      description={t("editor.includesDescription")}
      action={
        <Button
          variant="secondary"
          size="sm"
          startIcon={<AddOutlined />}
          disabled={fields.length >= 12}
          onClick={() =>
            append({ title: { en: "", hi: "" }, desc: { en: "", hi: "" } })
          }
        >
          {t("editor.add")}
        </Button>
      }
    >
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("editor.listEmpty")}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            border: `1px solid ${tokens.neutral[200]}`,
            borderRadius: `${tokens.radius.md}px`,
            p: 4,
            display: "grid",
            gap: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="label" component="h3" sx={{ m: 0 }}>
              {t("editor.stepN", { n: index + 1 })}
            </Typography>
            <IconButton
              label={t("editor.removeItem", {
                item: t("editor.stepN", { n: index + 1 }),
              })}
              size="sm"
              onClick={() => remove(index)}
            >
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Box>
          <LocalizedField
            path={`overview.${index}.title`}
            label={t("editor.stepTitle")}
            lang={lang}
          />
          <LocalizedField
            path={`overview.${index}.desc`}
            label={t("editor.stepDescription")}
            lang={lang}
            multiline
            minRows={2}
          />
        </Box>
      ))}
    </EditorSection>
  );
}

function FaqEditor({ lang }: { lang: EditLang }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control } = useFormContext<ServiceInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "faq" });
  return (
    <EditorSection
      title={t("editor.faq")}
      action={
        <Button
          variant="secondary"
          size="sm"
          startIcon={<AddOutlined />}
          disabled={fields.length >= 15}
          onClick={() =>
            append({ question: { en: "", hi: "" }, answer: { en: "", hi: "" } })
          }
        >
          {t("editor.add")}
        </Button>
      }
    >
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("editor.listEmpty")}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            border: `1px solid ${tokens.neutral[200]}`,
            borderRadius: `${tokens.radius.md}px`,
            p: 4,
            display: "grid",
            gap: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="label" component="h3" sx={{ m: 0 }}>
              {t("editor.questionN", { n: index + 1 })}
            </Typography>
            <IconButton
              label={t("editor.removeItem", {
                item: t("editor.questionN", { n: index + 1 }),
              })}
              size="sm"
              onClick={() => remove(index)}
            >
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Box>
          <LocalizedField
            path={`faq.${index}.question`}
            label={t("editor.question")}
            lang={lang}
          />
          <LocalizedField
            path={`faq.${index}.answer`}
            label={t("editor.answer")}
            lang={lang}
            multiline
            minRows={2}
          />
        </Box>
      ))}
    </EditorSection>
  );
}

/** Gender, categories (up to 3) and filters (up to 6); the skills follow from the categories. */
function PlacementEditor({ categories }: { categories: CategoryDto[] }) {
  const { t } = useTranslation("admin");
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ServiceInput>();
  const gender = useWatch({ control, name: "gender" });
  const chosen = useWatch({ control, name: "categorySlugs" });
  const filters = useWatch({ control, name: "filterSlugs" });
  const available = categories.filter((category) => category.gender === gender);
  const chosenCategories = categories.filter((category) =>
    chosen.includes(category.slug),
  );
  const filterOptions = chosenCategories.flatMap(
    (category) => category.filters,
  );
  const skills = [
    ...new Set(chosenCategories.map((category) => category.skill)),
  ];
  const categoryError = get(errors, "categorySlugs")?.message as
    string | undefined;

  const toggle = (list: string[], value: string, max: number) =>
    list.includes(value)
      ? list.filter((item) => item !== value)
      : list.length < max
        ? [...list, value]
        : list;

  return (
    <EditorSection title={t("editor.placement")}>
      <SegmentedControl
        label={t("editor.gender")}
        showLabel
        name="gender"
        value={gender}
        fullWidth
        onChange={(value) => {
          setValue("gender", value, { shouldDirty: true });
          setValue("categorySlugs", [], { shouldDirty: true });
          setValue("filterSlugs", [], { shouldDirty: true });
        }}
        options={[
          { value: "women", label: t("editor.women") },
          { value: "men", label: t("editor.men") },
        ]}
      />
      <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
        <Typography component="legend" variant="label" sx={{ p: 0, mb: 1 }}>
          {t("editor.categories")}
        </Typography>
        <Box sx={{ display: "grid" }}>
          {available.map((category) => (
            <Checkbox
              key={category.slug}
              label={category.name.en}
              checked={chosen.includes(category.slug)}
              onChange={() => {
                const next = toggle(chosen, category.slug, 3);
                setValue("categorySlugs", next, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                const allowed = new Set(
                  categories
                    .filter((item) => next.includes(item.slug))
                    .flatMap((item) =>
                      item.filters.map((filter) => filter.slug),
                    ),
                );
                setValue(
                  "filterSlugs",
                  filters.filter((slugValue) => allowed.has(slugValue)),
                  { shouldDirty: true },
                );
              }}
            />
          ))}
        </Box>
        {categoryError && (
          <Typography
            variant="body2"
            role="alert"
            sx={{ color: "error.main", mt: 1 }}
          >
            {fieldText(t, categoryError)}
          </Typography>
        )}
      </Box>
      {filterOptions.length > 0 && (
        <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
          <Typography component="legend" variant="label" sx={{ p: 0, mb: 1 }}>
            {t("editor.filters")}
          </Typography>
          <Box sx={{ display: "grid" }}>
            {filterOptions.map((filter) => (
              <Checkbox
                key={filter.slug}
                label={filter.name.en}
                checked={filters.includes(filter.slug)}
                onChange={() =>
                  setValue("filterSlugs", toggle(filters, filter.slug, 6), {
                    shouldDirty: true,
                  })
                }
              />
            ))}
          </Box>
        </Box>
      )}
      {skills.length > 0 && (
        <Box>
          <Typography variant="label" component="p" sx={{ m: 0 }}>
            {t("editor.skills")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {skills.map((skill) => SKILL_LABELS[skill].en).join("; ")}
          </Typography>
        </Box>
      )}
    </EditorSection>
  );
}
