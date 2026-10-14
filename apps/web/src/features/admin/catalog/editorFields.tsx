import { type ChangeEvent, type ReactNode, useRef, useState } from "react";
import type { ImageRef, Localized } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { Controller, get, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Badge, Button, IconButton, InlineAlert, Picture, TextField } from "@/design-system";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { type MediaFolder, useUploadImage } from "./api";

export type EditLang = "en" | "hi";

/** A titled block of the editor; the content column is a single-column form (plan B9). */
export function EditorSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  const { tokens } = useTheme();
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Box component="section" aria-labelledby={id} sx={{ bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 4, md: 6 } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3, mb: 5 }}>
        <Box>
          <Typography id={id} variant="h2" sx={{ typography: "h3" }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box sx={{ display: "grid", gap: 5 }}>{children}</Box>
    </Box>
  );
}

/**
 * One text in the language being edited. In Hindi the English text is shown underneath,
 * so a translator always sees what they are translating.
 */
export function LocalizedField({ path, label, lang, multiline = false, minRows, hint }: { path: string; label: string; lang: EditLang; multiline?: boolean; minRows?: number; hint?: string }) {
  const { t } = useTranslation("admin");
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const english = useWatch({ name: `${path}.en` }) as string | undefined;
  const error = get(errors, `${path}.${lang}`)?.message as string | undefined;
  const reference = lang === "hi" ? (english ? t("editor.englishReference", { text: english }) : t("editor.noEnglish")) : hint;

  return (
    <TextField
      key={lang}
      label={lang === "hi" ? t("editor.inHindi", { label }) : label}
      lang={lang}
      multiline={multiline}
      minRows={minRows}
      hint={reference}
      optional={lang === "hi"}
      {...fieldProps(register(`${path}.${lang}`))}
      error={fieldText(t, error)}
    />
  );
}

/** Whole rupees in the form, integer paise in the data (catalogue prices have no paise). */
export function MoneyField({ name, label, optional = false, hint }: { name: string; label: string; optional?: boolean; hint?: string }) {
  const { t } = useTranslation("admin");
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          optional={optional}
          hint={hint}
          inputMode="numeric"
          autoComplete="off"
          startAdornment={<InputAdornment position="start">₹</InputAdornment>}
          name={field.name}
          inputRef={field.ref}
          onBlur={field.onBlur}
          value={typeof field.value === "number" && field.value > 0 ? String(Math.round(field.value / 100)) : ""}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 7);
            field.onChange(digits === "" ? (optional ? null : 0) : Number(digits) * 100);
          }}
          error={fieldText(t, fieldState.error?.message)}
        />
      )}
    />
  );
}

/** A whole number (minutes, sessions). */
export function CountField({ name, label, suffix }: { name: string; label: string; suffix?: string }) {
  const { t } = useTranslation("admin");
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          inputMode="numeric"
          autoComplete="off"
          endAdornment={suffix ? <InputAdornment position="end">{suffix}</InputAdornment> : undefined}
          name={field.name}
          inputRef={field.ref}
          onBlur={field.onBlur}
          value={typeof field.value === "number" && field.value > 0 ? String(field.value) : ""}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
            field.onChange(digits === "" ? 0 : Number(digits));
          }}
          error={fieldText(t, fieldState.error?.message)}
        />
      )}
    />
  );
}

const emptyText = (): Localized => ({ en: "", hi: "" });

/** A list of short texts (good to know, aftercare…): add, remove, edit in place. */
export function TextListEditor({ name, label, itemLabel, lang, max }: { name: string; label: string; itemLabel: string; lang: EditLang; max: number }) {
  const { t } = useTranslation("admin");
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <EditorSection
      title={label}
      action={
        <Button variant="secondary" size="sm" startIcon={<AddOutlined />} onClick={() => append(emptyText())} disabled={fields.length >= max}>
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
        <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "start" }}>
          <LocalizedField path={`${name}.${index}`} label={`${itemLabel} ${index + 1}`} lang={lang} multiline minRows={1} />
          <IconButton label={t("editor.removeItem", { item: `${itemLabel} ${index + 1}` })} onClick={() => remove(index)} sx={{ mt: 6 }}>
            <DeleteOutlineOutlined />
          </IconButton>
        </Box>
      ))}
    </EditorSection>
  );
}

/** Photos: upload (re-encoded on the server), remove, choose the cover (the first one). */
export function ImagesEditor({ name, folder, max, label }: { name: string; folder: MediaFolder; max: number; label: string }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const images = (useWatch({ control, name }) ?? []) as ImageRef[];
  const upload = useUploadImage(folder);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    setError(null);
    let count = fields.length;
    for (const file of Array.from(files ?? [])) {
      if (count >= max) break;
      try {
        const { image } = await upload.mutateAsync(file);
        append(image);
        count++;
      } catch (failure) {
        const key = isApiError(failure) ? failure.fields.file : undefined;
        setError(key ? (fieldText(t, key) ?? errorText(t, failure)) : errorText(t, failure));
      }
    }
    if (input.current) input.current.value = "";
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {fields.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {fields.map((field, index) => (
            <Box component="li" key={field.id} sx={{ display: "grid", gap: 1.5 }}>
              <Picture image={images[index] ?? null} alt={t("editor.photoAlt", { index: index + 1 })} sizes={200} ratio="4 / 3" />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                {index === 0 ? (
                  <Badge tone="accent">{t("editor.cover")}</Badge>
                ) : (
                  <IconButton label={t("editor.makeCover", { index: index + 1 })} size="sm" onClick={() => move(index, 0)}>
                    <ArrowUpwardOutlined fontSize="small" />
                  </IconButton>
                )}
                <IconButton label={t("editor.removePhoto", { index: index + 1 })} size="sm" onClick={() => remove(index)}>
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box
        component="input"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
        multiple={max > 1}
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => void onFiles(event.target.files)}
      />
      <Button variant="secondary" startIcon={<FileUploadOutlined />} loading={upload.isPending} disabled={fields.length >= max} onClick={() => input.current?.click()}>
        {fields.length === 0 ? t("editor.uploadFirst", { label }) : t("editor.uploadMore")}
      </Button>
      <Typography variant="caption" component="p" sx={{ m: 0, color: tokens.neutral[600] }}>
        {t("editor.photoHint", { max })}
      </Typography>
    </Box>
  );
}

/** One photo held by a Controller (a category's picture): upload, replace or remove. */
export function SingleImageEditor({ value, onChange, folder, label }: { value: ImageRef | null; onChange: (image: ImageRef | null) => void; folder: MediaFolder; label: string }) {
  const { t } = useTranslation("admin");
  const upload = useUploadImage(folder);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    try {
      const { image } = await upload.mutateAsync(file);
      onChange(image);
    } catch (failure) {
      const key = isApiError(failure) ? failure.fields.file : undefined;
      setError(key ? (fieldText(t, key) ?? errorText(t, failure)) : errorText(t, failure));
    }
    if (input.current) input.current.value = "";
  };

  return (
    <Box sx={{ display: "grid", gap: 3, maxWidth: 320 }}>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {value && <Picture image={value} alt={t("editor.photoOf", { label })} sizes={320} ratio="4 / 3" />}
      <Box
        component="input"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => void onFile(event.target.files?.[0])}
      />
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="secondary" startIcon={<FileUploadOutlined />} loading={upload.isPending} onClick={() => input.current?.click()}>
          {value ? t("editor.replacePhoto") : t("editor.uploadFirst", { label })}
        </Button>
        {value && (
          <Button variant="tertiary" onClick={() => onChange(null)}>
            {t("editor.removePhotoShort")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
