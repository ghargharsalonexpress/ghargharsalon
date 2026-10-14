import { useEffect, useState } from "react";
import {
  type ProfessionalDto,
  type ProfessionalInput,
  professionalInputSchema,
  SKILL_LABELS,
  SKILLS,
  type z,
} from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useBlocker, useNavigate, useParams } from "react-router";
import {
  ActionBar,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  Link,
  PageHeader,
  PhoneField,
  SegmentedControl,
  TextField,
  useToast,
} from "@/design-system";
import {
  CountField,
  EditorSection,
  SingleImageEditor,
} from "@/features/admin/catalog/editorFields";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { adminProfessionalQuery, useSaveProfessional } from "./api";

type Values = z.output<typeof professionalInputSchema>;

const blank = (): ProfessionalInput => ({
  name: "",
  email: "",
  phone: "",
  gender: "female",
  skills: [],
  baseArea: "",
  travelRadiusKm: 5,
  verified: false,
  verificationNote: "",
  photo: null,
  // Professionals use the panel in Hindi first (plan A2); they can switch.
  locale: "hi",
});

const toInput = (dto: ProfessionalDto): ProfessionalInput => ({
  name: dto.name,
  email: dto.email ?? "",
  phone: dto.phone,
  gender: dto.gender,
  skills: dto.skills,
  baseArea: dto.baseArea,
  travelRadiusKm: dto.travelRadiusKm,
  verified: dto.verifiedAt !== null,
  verificationNote: dto.verificationNote,
  photo: dto.photo,
  locale: dto.locale,
});

/** /admin/professionals/new and /:id/edit (plan W11): the application, entered by the team. */
export function ProfessionalEditorPage() {
  const { id } = useParams();
  const { t } = useTranslation("admin");
  const existing = useQuery({
    ...adminProfessionalQuery(id ?? "new"),
    enabled: Boolean(id),
  });

  if (id && existing.isError) {
    return (
      <EmptyState
        headingLevel="h1"
        title={t("proEditor.notFoundTitle")}
        description={errorText(t, existing.error)}
        action={
          <Button to="/admin/professionals">{t("proEditor.backToList")}</Button>
        }
      />
    );
  }
  if (id && !existing.data) {
    return (
      <Box aria-busy sx={{ display: "grid", gap: 4 }}>
        <Skeleton width={280} height={40} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  return (
    <ProfessionalEditor key={id ?? "new"} initial={existing.data ?? null} />
  );
}

function ProfessionalEditor({ initial }: { initial: ProfessionalDto | null }) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveProfessional();
  const [formError, setFormError] = useState<unknown>(null);

  const methods = useForm<ProfessionalInput, unknown, Values>({
    resolver: standardSchemaResolver(professionalInputSchema),
    mode: "onTouched",
    defaultValues: initial ? toInput(initial) : blank(),
  });
  const { register, control, handleSubmit, setValue, setError, formState } =
    methods;
  const skills = useWatch({ control, name: "skills" });
  const verified = useWatch({ control, name: "verified" });
  usePageMeta(initial ? initial.name : t("proEditor.newTitle"));

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

  const onSubmit = handleSubmit(async (professional) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        id: initial?.id ?? null,
        version: initial?.version ?? 0,
        professional,
      });
      toast(initial ? t("proEditor.saved") : t("proEditor.created"));
      await navigate(`/admin/professionals/${saved.id}`, {
        state: { saved: true },
      });
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fields).length > 0) {
        Object.entries(error.fields).forEach(([path, key], index) =>
          setError(
            path as never,
            { type: "server", message: key },
            { shouldFocus: index === 0 },
          ),
        );
        if (error.code === "VALIDATION_FAILED" || error.code === "EMAIL_TAKEN" || error.code === "PHONE_TAKEN")
          return;
      }
      setFormError(error);
    }
  });

  const errors = formState.errors;
  return (
    <FormProvider {...methods}>
      <Box component="form" noValidate onSubmit={onSubmit}>
        <PageHeader
          breadcrumb={
            <Link
              to={
                initial
                  ? `/admin/professionals/${initial.id}`
                  : "/admin/professionals"
              }
              standalone
            >
              {initial ? initial.name : t("proEditor.backToList")}
            </Link>
          }
          title={
            initial
              ? t("proEditor.editTitle", { name: initial.name })
              : t("proEditor.newTitle")
          }
          description={initial ? undefined : t("proEditor.newDescription")}
        />
        <Box sx={{ display: "grid", gap: 6, maxWidth: 760 }}>
          {formError ? (
            <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert>
          ) : null}

          <EditorSection title={t("proEditor.person")}>
            <TextField
              label={t("proEditor.name")}
              autoComplete="off"
              {...fieldProps(register("name"))}
              error={fieldText(t, errors.name?.message)}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneField
                  label={t("proEditor.phone")}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  hint={t("proEditor.phoneHint")}
                  error={fieldText(t, errors.phone?.message)}
                />
              )}
            />
            <TextField
              label={t("proEditor.email")}
              type="email"
              inputMode="email"
              autoComplete="off"
              hint={t("proEditor.emailHint")}
              {...fieldProps(register("email"))}
              error={fieldText(t, errors.email?.message)}
            />
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <SegmentedControl
                  label={t("proEditor.gender")}
                  showLabel
                  name="pro-gender"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "female", label: t("proEditor.female") },
                    { value: "male", label: t("proEditor.male") },
                  ]}
                />
              )}
            />
            <Controller
              control={control}
              name="locale"
              render={({ field }) => (
                <SegmentedControl
                  label={t("proEditor.language")}
                  showLabel
                  name="pro-locale"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "hi", label: <span lang="hi">हिन्दी</span> },
                    { value: "en", label: "English" },
                  ]}
                />
              )}
            />
          </EditorSection>

          <EditorSection title={t("proEditor.work")}>
            <Box
              component="fieldset"
              sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
            >
              <Typography
                component="legend"
                variant="label"
                sx={{ p: 0, mb: 1 }}
              >
                {t("proEditor.skills")}
              </Typography>
              <Box sx={{ display: "grid" }}>
                {SKILLS.map((skill) => (
                  <Checkbox
                    key={skill}
                    label={SKILL_LABELS[skill].en}
                    checked={skills.includes(skill)}
                    onChange={(on) =>
                      setValue(
                        "skills",
                        on
                          ? [...skills, skill]
                          : skills.filter((item) => item !== skill),
                        {
                          shouldDirty: true,
                          shouldValidate: formState.isSubmitted,
                        },
                      )
                    }
                  />
                ))}
              </Box>
              {errors.skills && (
                <Typography
                  variant="body2"
                  role="alert"
                  sx={{ color: "error.main", mt: 1 }}
                >
                  {fieldText(t, errors.skills.message)}
                </Typography>
              )}
            </Box>
            <TextField
              label={t("proEditor.baseArea")}
              hint={t("proEditor.baseAreaHint")}
              {...fieldProps(register("baseArea"))}
              error={fieldText(t, errors.baseArea?.message)}
            />
            <Box sx={{ maxWidth: 240 }}>
              <CountField
                name="travelRadiusKm"
                label={t("proEditor.radius")}
                suffix="km"
              />
            </Box>
          </EditorSection>

          <EditorSection
            title={t("proEditor.verification")}
            description={t("proEditor.verificationDescription")}
          >
            <Controller
              control={control}
              name="verified"
              render={({ field }) => (
                <Checkbox
                  label={t("proEditor.verified")}
                  description={t("proEditor.verifiedHint")}
                  checked={field.value}
                  onChange={field.onChange}
                  name={field.name}
                />
              )}
            />
            {initial?.verifiedAt && verified && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("proEditor.verifiedBy", {
                  name: initial.verifiedBy ?? "",
                  date: new Date(initial.verifiedAt).toLocaleDateString(
                    "en-IN",
                    { dateStyle: "medium" },
                  ),
                })}
              </Typography>
            )}
            <TextField
              label={t("proEditor.note")}
              optional
              multiline
              minRows={2}
              hint={t("proEditor.noteHint")}
              {...fieldProps(register("verificationNote"))}
              error={fieldText(t, errors.verificationNote?.message)}
            />
          </EditorSection>

          <EditorSection
            title={t("proEditor.photo")}
            description={t("proEditor.photoDescription")}
          >
            <Controller
              control={control}
              name="photo"
              render={({ field }) => (
                <SingleImageEditor
                  value={field.value}
                  onChange={field.onChange}
                  folder="professionals"
                  label={t("proEditor.photoLabel")}
                />
              )}
            />
          </EditorSection>
        </Box>

        <ActionBar always>
          <Typography variant="body2" sx={{ flex: 1, color: "text.secondary" }}>
            {initial
              ? formState.isDirty
                ? t("editor.unsaved")
                : t("editor.allSaved")
              : t("proEditor.emailNote")}
          </Typography>
          <Button type="submit" loading={save.isPending}>
            {initial ? t("editor.save") : t("proEditor.create")}
          </Button>
        </ActionBar>
      </Box>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title={t("editor.leaveTitle")}
        consequence={t("proEditor.leaveBody")}
        confirmLabel={t("editor.leaveConfirm")}
        cancelLabel={t("editor.leaveCancel")}
      />
    </FormProvider>
  );
}
