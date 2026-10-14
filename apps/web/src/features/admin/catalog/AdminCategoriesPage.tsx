import { useState } from "react";
import { CATALOG_GENDERS, type CategoryDto, type CategoryInput, categoryInputSchema, SKILL_LABELS, SKILLS, type Skill } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, FormProvider, get, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Badge, Button, IconButton, InlineAlert, PageHeader, Picture, ResponsiveDialog, SegmentedControl, SelectField, Switch, TextField, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { adminCategoriesQuery, useReorderCategories, useSaveCategory } from "./api";
import { type EditLang, LocalizedField, SingleImageEditor } from "./editorFields";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const categoryResolver = standardSchemaResolver(categoryInputSchema);

/** The address from the name when left empty; filter addresses are fixed once made (services refer to them). */
function prepareCategory(values: CategoryInput): CategoryInput {
  const used = new Set<string>();
  const filters = values.filters.map((filter, index) => {
    let slug = filter.slug || slugify(filter.name.en) || `filter-${index + 1}`;
    while (used.has(slug)) slug = `${slug}-${index + 1}`;
    used.add(slug);
    return { ...filter, slug };
  });
  return { ...values, slug: values.slug || slugify(values.name.en), filters };
}

/** /admin/categories (plan Phase 3): order, names in both languages, filters, skill, photo. */
export function AdminCategoriesPage() {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useQuery(adminCategoriesQuery);
  const reorder = useReorderCategories();
  const [editing, setEditing] = useState<CategoryDto | "new" | null>(null);
  usePageMeta(t("categories.title"));

  /** Moves one category within its gender group, saving the whole order at once. */
  const move = (gender: string, from: number, to: number) => {
    const all = categories.data ?? [];
    const group = all.filter((category) => category.gender === gender);
    if (to < 0 || to >= group.length || from === to) return;
    const [moved] = group.splice(from, 1);
    if (!moved) return;
    group.splice(to, 0, moved);
    const next = CATALOG_GENDERS.flatMap((g) => (g === gender ? group : all.filter((category) => category.gender === g))).map((category, order) => ({ ...category, order }));
    const previous = all;
    queryClient.setQueryData(adminCategoriesQuery.queryKey, next);
    reorder.mutate(
      next.map((category) => category.slug),
      {
        onSuccess: () => toast(t("categories.reordered", { name: moved.name.en, position: to + 1 })),
        onError: (error) => {
          queryClient.setQueryData(adminCategoriesQuery.queryKey, previous);
          toast(errorText(t, error));
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title={t("categories.title")}
        description={t("categories.description")}
        actions={
          <Button startIcon={<AddOutlined />} onClick={() => setEditing("new")}>
            {t("categories.new")}
          </Button>
        }
      />
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 6 }}>
        <Button startIcon={<AddOutlined />} fullWidth onClick={() => setEditing("new")}>
          {t("categories.new")}
        </Button>
      </Box>

      {categories.isError ? (
        <InlineAlert tone="danger">{errorText(t, categories.error)}</InlineAlert>
      ) : (
        <Box sx={{ display: "grid", gap: 8 }}>
          {CATALOG_GENDERS.map((gender) => (
            <CategoryGroup key={gender} gender={gender} categories={categories.data?.filter((category) => category.gender === gender)} onMove={(from, to) => move(gender, from, to)} onEdit={setEditing} />
          ))}
        </Box>
      )}

      {editing && <CategoryDialog category={editing === "new" ? null : editing} nextOrder={categories.data?.length ?? 0} onClose={() => setEditing(null)} />}
    </>
  );
}

function CategoryGroup({ gender, categories, onMove, onEdit }: { gender: string; categories: CategoryDto[] | undefined; onMove: (from: number, to: number) => void; onEdit: (category: CategoryDto) => void }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const titleId = `categories-${gender}`;

  return (
    <Box component="section" aria-labelledby={titleId}>
      <Typography id={titleId} variant="h2" sx={{ typography: "h3", mb: 3 }}>
        {t(`categories.${gender}`)}
      </Typography>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
        {!categories
          ? [0, 1, 2].map((index) => (
              <Box component="li" key={index} sx={{ p: 4 }}>
                <Skeleton width="40%" />
              </Box>
            ))
          : categories.map((category, index) => (
              <Box
                component="li"
                key={category.slug}
                draggable
                onDragStart={() => setDragFrom(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragFrom !== null) onMove(dragFrom, index);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "auto minmax(0, 1fr)", md: "auto 56px minmax(0, 1fr) auto" },
                  alignItems: "center",
                  gap: 4,
                  px: 4,
                  py: 3,
                  opacity: dragFrom === index ? 0.5 : 1,
                  "& + &": { borderTop: `1px solid ${tokens.neutral[200]}` },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DragIndicatorOutlined aria-hidden sx={{ color: tokens.neutral[400], cursor: "grab", display: { xs: "none", md: "block" } }} />
                  <IconButton label={t("categories.moveUp", { name: category.name.en })} size="sm" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
                    <ArrowUpwardOutlined fontSize="small" />
                  </IconButton>
                  <IconButton label={t("categories.moveDown", { name: category.name.en })} size="sm" disabled={index === categories.length - 1} onClick={() => onMove(index, index + 1)}>
                    <ArrowDownwardOutlined fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Picture image={category.image} alt="" sizes={56} ratio="1 / 1" radius="sm" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {category.name.en}
                    {category.name.hi && (
                      <Box component="span" lang="hi" sx={{ fontWeight: 400, color: "text.secondary" }}>
                        {` · ${category.name.hi}`}
                      </Box>
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {t("categories.meta", { count: category.serviceCount, filters: category.filters.length, skill: SKILL_LABELS[category.skill].en })}
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {!category.active && <Badge>{t("categories.hidden")}</Badge>}
                    {!category.image && <Badge tone="warning">{t("categories.noPhoto")}</Badge>}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
                  <Button variant="secondary" size="sm" onClick={() => onEdit(category)} aria-label={t("categories.editNamed", { name: category.name.en })}>
                    {t("categories.edit")}
                  </Button>
                </Box>
              </Box>
            ))}
      </Box>
    </Box>
  );
}

function CategoryDialog({ category, nextOrder, onClose }: { category: CategoryDto | null; nextOrder: number; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const save = useSaveCategory();
  const [lang, setLang] = useState<EditLang>("en");
  const [formError, setFormError] = useState<unknown>(null);

  const methods = useForm<CategoryInput>({
    resolver: (values, context, options) => categoryResolver(prepareCategory(values), context, options),
    mode: "onTouched",
    defaultValues: category
      ? { slug: category.slug, gender: category.gender, name: category.name, description: category.description, filters: category.filters, skill: category.skill, image: category.image, order: category.order, active: category.active }
      : { slug: "", gender: "women", name: { en: "", hi: "" }, description: { en: "", hi: "" }, filters: [], skill: "salon_women", image: null, order: nextOrder, active: false },
  });
  const { control, register, handleSubmit, setValue, setError, formState } = methods;
  const filters = useFieldArray({ control, name: "filters" });
  const gender = useWatch({ control, name: "gender" });

  // `values` has been through prepareCategory() by the resolver.
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ slug: category?.slug ?? null, category: values });
      toast(category ? t("categories.saved") : t("categories.created"));
      onClose();
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fields).length > 0) {
        Object.entries(error.fields).forEach(([path, key], index) => setError(path as never, { type: "server", message: key }, { shouldFocus: index === 0 }));
        if (error.code === "VALIDATION_FAILED") return;
      }
      setFormError(error);
    }
  });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      form
      maxWidth="md"
      title={category ? t("categories.editTitle", { name: category.name.en }) : t("categories.newTitle")}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("categories.cancel")}
          </Button>
          <Button type="submit" form="category-form" loading={save.isPending}>
            {category ? t("categories.save") : t("categories.create")}
          </Button>
        </>
      }
    >
      <FormProvider {...methods}>
        <Box component="form" id="category-form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5, pt: 1 }}>
          {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
          <SegmentedControl
            label={t("editor.language")}
            showLabel
            name="category-language"
            value={lang}
            onChange={setLang}
            options={[
              { value: "en", label: "English" },
              { value: "hi", label: <span lang="hi">हिन्दी</span> },
            ]}
          />
          <LocalizedField path="name" label={t("categories.name")} lang={lang} />
          <LocalizedField path="description" label={t("categories.descriptionField")} lang={lang} multiline minRows={2} />
          {!category && (
            <SegmentedControl
              label={t("editor.gender")}
              showLabel
              name="category-gender"
              value={gender}
              onChange={(value) => setValue("gender", value, { shouldDirty: true })}
              options={[
                { value: "women", label: t("editor.women") },
                { value: "men", label: t("editor.men") },
              ]}
            />
          )}
          <TextField label={t("editor.slug")} hint={t("categories.slugHint")} {...fieldProps(register("slug"))} error={fieldText(t, get(formState.errors, "slug")?.message as string | undefined)} />
          <Controller
            control={control}
            name="skill"
            render={({ field }) => (
              <SelectField<Skill>
                label={t("categories.skill")}
                hint={t("categories.skillHint")}
                value={field.value}
                onChange={field.onChange}
                name={field.name}
                options={SKILLS.map((skill) => ({ value: skill, label: SKILL_LABELS[skill].en }))}
              />
            )}
          />

          <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0, display: "grid", gap: 3 }}>
            <Typography component="legend" variant="label" sx={{ p: 0, mb: 1 }}>
              {t("categories.filters")}
            </Typography>
            {filters.fields.map((field, index) => (
              <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "start" }}>
                <LocalizedField path={`filters.${index}.name`} label={t("categories.filterN", { n: index + 1 })} lang={lang} />
                <IconButton label={t("editor.removeItem", { item: t("categories.filterN", { n: index + 1 }) })} onClick={() => filters.remove(index)} sx={{ mt: 6 }}>
                  <DeleteOutlineOutlined />
                </IconButton>
              </Box>
            ))}
            <Box>
              <Button variant="secondary" size="sm" startIcon={<AddOutlined />} disabled={filters.fields.length >= 24} onClick={() => filters.append({ slug: "", name: { en: "", hi: "" } })}>
                {t("categories.addFilter")}
              </Button>
            </Box>
          </Box>

          <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
            <Typography component="legend" variant="label" sx={{ p: 0, mb: 2 }}>
              {t("categories.photo")}
            </Typography>
            <Controller control={control} name="image" render={({ field }) => <SingleImageEditor value={field.value} onChange={field.onChange} folder="categories" label={t("categories.photo")} />} />
          </Box>
          <Controller
            control={control}
            name="active"
            render={({ field }) => <Switch label={t("categories.active")} description={t("categories.activeHint")} checked={field.value} onChange={field.onChange} name={field.name} />}
          />
        </Box>
      </FormProvider>
    </ResponsiveDialog>
  );
}
