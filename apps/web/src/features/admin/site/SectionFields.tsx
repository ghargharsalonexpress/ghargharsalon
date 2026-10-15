import { type ChangeEvent, type MouseEvent, useRef, useState } from "react";
import { type ImageRef, isUploadedVideo, pick } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, get, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button, IconButton, InlineAlert, SelectField, Switch, TextField } from "@/design-system";
import { catalogQuery } from "@/features/catalog/api";
import { FeatureIconView } from "@/features/site/icons";
import { api, isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { videoSrc } from "@/lib/media";
import { type EditLang, LocalizedField, SingleImageEditor } from "../catalog/editorFields";
import { adminPagesQuery } from "./api";
import type { FieldSpec } from "./sectionSpecs";

// The page builder's fields, drawn from the specs in sectionSpecs.ts (ADR-0021). In Hindi
// only the texts show (it is a translation view); everything else is edited in English.

export const MARKDOWN_HINT = "Formatting: “## ” starts a heading, “- ” a list item, **bold**, [link text](/page). Live values: {{phone}}, {{min}}–{{max}}, {{open}}, {{cancelFee}}…";

export function FieldList({ fields, base, lang }: { fields: ReadonlyArray<FieldSpec>; base: string; lang: EditLang }) {
  return (
    <>
      {fields.map((spec) => (
        <Field key={spec.name} spec={spec} path={base ? `${base}.${spec.name}` : spec.name} lang={lang} />
      ))}
    </>
  );
}

function Field({ spec, path, lang }: { spec: FieldSpec; path: string; lang: EditLang }) {
  if (spec.kind === "text") {
    return <LocalizedField path={path} label={spec.label} lang={lang} multiline={spec.multiline ?? spec.markdown} minRows={spec.rows} hint={spec.markdown ? [spec.hint, MARKDOWN_HINT].filter(Boolean).join(" ") : spec.hint} />;
  }
  if (spec.kind === "cta") return <CtaField spec={spec} path={path} lang={lang} />;
  if (spec.kind === "list") return <ListField spec={spec} path={path} lang={lang} />;
  if (spec.kind === "textList") return <TextListField spec={spec} path={path} lang={lang} />;
  // Not text: edited once, in English.
  if (lang === "hi") return null;
  switch (spec.kind) {
    case "plain":
      return <PlainField label={spec.label} hint={spec.hint} path={path} />;
    case "link":
      return <LinkField label={spec.label} hint={spec.hint} path={path} />;
    case "image":
      return <ImageField label={spec.label} hint={spec.hint} path={path} />;
    case "video":
      return <VideoField label={spec.label} hint={spec.hint} path={path} />;
    case "select":
      return <SelectSpecField spec={spec} path={path} />;
    case "number":
      return <NumberField label={spec.label} hint={spec.hint} suffix={spec.suffix} path={path} />;
    case "switch":
      return <SwitchField label={spec.label} hint={spec.hint} path={path} />;
    case "icon":
      return <IconField label={spec.label} path={path} />;
    case "services":
      return <ServicesField label={spec.label} hint={spec.hint} path={path} />;
  }
}

const useError = (path: string) => {
  const { t } = useTranslation("admin");
  const {
    formState: { errors },
  } = useFormContext();
  return fieldText(t, get(errors, path)?.message as string | undefined);
};

export function PlainField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { register } = useFormContext();
  const error = useError(path);
  return <TextField label={label} hint={hint} optional {...fieldProps(register(path))} error={error} />;
}

function NumberField({ label, hint, suffix, path }: { label: string; hint?: string; suffix?: string; path: string }) {
  const { control } = useFormContext();
  const error = useError(path);
  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => (
        <TextField
          label={label}
          hint={hint}
          inputMode="numeric"
          autoComplete="off"
          endAdornment={suffix ? <InputAdornment position="end">{suffix}</InputAdornment> : undefined}
          name={field.name}
          inputRef={field.ref}
          onBlur={field.onBlur}
          value={typeof field.value === "number" ? String(field.value) : ""}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
            field.onChange(digits === "" ? 0 : Number(digits));
          }}
          error={error}
        />
      )}
    />
  );
}

export function SwitchField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { control } = useFormContext();
  return <Controller control={control} name={path} render={({ field }) => <Switch label={label} description={hint} name={field.name} checked={Boolean(field.value)} onChange={field.onChange} />} />;
}

export function ImageField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { control } = useFormContext();
  const error = useError(path);
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography variant="label" component="p" sx={{ m: 0 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="body2" sx={{ m: 0, mt: -1, color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
      <Controller control={control} name={path} render={({ field }) => <SingleImageEditor value={(field.value as ImageRef | null) ?? null} onChange={field.onChange} folder="site" label={label.replace(/\s*\(.*\)$/, "").toLowerCase()} />} />
      {error && (
        <Typography variant="body2" role="alert" sx={{ color: "error.main" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

/** A video: upload a clip (MP4 or WebM, up to 25 MB) or paste a link, with a small preview. */
function VideoField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { control } = useFormContext();
  const error = useError(path);
  const input = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.upload<{ video: string }>("/v1/admin/media/video", form);
    },
  });

  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const onFile = async (file: File | undefined) => {
          setUploadError(null);
          if (!file) return;
          try {
            field.onChange((await upload.mutateAsync(file)).video);
          } catch (failure) {
            const key = isApiError(failure) ? failure.fields.file : undefined;
            setUploadError(key ? (fieldText(t, key) ?? errorText(t, failure)) : errorText(t, failure));
          }
          if (input.current) input.current.value = "";
        };
        return (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Box>
              <Typography variant="label" component="p" sx={{ m: 0 }}>
                {label}
              </Typography>
              {hint && (
                <Typography variant="body2" sx={{ m: 0, mt: 1, color: "text.secondary" }}>
                  {hint}
                </Typography>
              )}
            </Box>
            {value && <Box component="video" src={videoSrc(value)} muted controls preload="metadata" sx={{ display: "block", width: "100%", maxWidth: 360, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: `${tokens.radius.md}px`, bgcolor: tokens.neutral[900] }} />}
            {uploadError && <InlineAlert tone="danger">{uploadError}</InlineAlert>}
            <Box component="input" ref={input} type="file" accept="video/mp4,video/webm" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void onFile(event.target.files?.[0])} />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button variant="secondary" startIcon={<FileUploadOutlined />} loading={upload.isPending} onClick={() => input.current?.click()}>
                {value ? "Replace video" : "Upload a video"}
              </Button>
              {value && (
                <Button variant="tertiary" onClick={() => field.onChange("")}>
                  Remove video
                </Button>
              )}
            </Box>
            <Typography variant="caption" component="p" sx={{ m: 0, color: tokens.neutral[600] }}>
              MP4 or WebM, up to 25 MB. A silent 10–20 second clip loads fastest.
            </Typography>
            <TextField
              label="Or paste a video link"
              hint="An https address ending in .mp4 or .webm."
              optional
              name={field.name}
              value={isUploadedVideo(value) ? "" : value}
              onChange={(event) => field.onChange(event.target.value.trim())}
              onBlur={field.onBlur}
              error={error}
            />
          </Box>
        );
      }}
    />
  );
}

function SelectSpecField({ spec, path }: { spec: Extract<FieldSpec, { kind: "select" }>; path: string }) {
  const { control } = useFormContext();
  const error = useError(path);
  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => (
        <SelectField
          label={spec.label}
          hint={spec.hint}
          name={field.name}
          value={field.value === undefined || field.value === null ? "" : String(field.value)}
          onChange={(value) => field.onChange(spec.numeric ? Number(value) : value)}
          options={spec.options}
          error={error}
        />
      )}
    />
  );
}

function IconField({ label, path }: { label: string; path: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => (
        <SelectField
          label={label}
          name={field.name}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          options={ICONS.map((icon) => ({
            value: icon.value,
            label: (
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <FeatureIconView icon={icon.value} fontSize="small" />
                {icon.label}
              </Box>
            ),
          }))}
        />
      )}
    />
  );
}

/** A link: type any address, or pick a page of the site. */
export function LinkField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { control } = useFormContext();
  const error = useError(path);
  const options = useLinkOptions();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => (
        <>
          <TextField
            label={label}
            hint={hint ?? "A page of this site (/about), a web address (https://…), tel:+91… or mailto:…"}
            optional
            name={field.name}
            inputRef={field.ref}
            value={(field.value as string) ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
            onBlur={field.onBlur}
            error={error}
            endAdornment={
              <InputAdornment position="end">
                <IconButton label="Choose a page" size="sm" onClick={(event: MouseEvent<HTMLButtonElement>) => setAnchor(event.currentTarget)}>
                  <LinkOutlined fontSize="small" />
                </IconButton>
              </InputAdornment>
            }
          />
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 420 } } }}>
            {options.flatMap((group) => [
              <ListSubheader key={`h-${group.title}`}>{group.title}</ListSubheader>,
              ...group.items.map((item) => (
                <MenuItem
                  key={`${group.title}-${item.href}`}
                  onClick={() => {
                    field.onChange(item.href);
                    setAnchor(null);
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>{item.label}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {item.href}
                    </Typography>
                  </Box>
                </MenuItem>
              )),
            ])}
          </Menu>
        </>
      )}
    />
  );
}

/** Pages of the site, catalogue categories and the app's own screens, for the link picker. */
function useLinkOptions() {
  const pages = useQuery(adminPagesQuery).data ?? [];
  const catalog = useQuery(catalogQuery).data;
  return [
    { title: "Website pages", items: pages.map((page) => ({ label: page.title.en, href: page.path })) },
    {
      title: "Booking",
      items: [
        { label: "All services", href: "/services" },
        { label: "Men's services", href: "/services?gender=men" },
        { label: "Cart", href: "/cart" },
        { label: "Log in", href: "/login" },
        { label: "My bookings", href: "/account/bookings" },
      ],
    },
    { title: "Categories", items: (catalog?.categories ?? []).map((category) => ({ label: category.name.en, href: `/services?category=${category.slug}` })) },
    {
      title: "Home page sections",
      items: [
        { label: "Categories", href: "/#categories" },
        { label: "How it works", href: "/#how-it-works" },
        { label: "Questions", href: "/#faq" },
        { label: "Reviews", href: "/#reviews" },
      ],
    },
  ].filter((group) => group.items.length > 0);
}

function CtaField({ spec, path, lang }: { spec: Extract<FieldSpec, { kind: "cta" }>; path: string; lang: EditLang }) {
  const { tokens } = useTheme();
  return (
    <Box sx={{ p: 4, borderRadius: `${tokens.radius.md}px`, border: `1px dashed ${tokens.neutral[300]}`, display: "grid", gap: 4 }}>
      <Typography variant="label" component="p" sx={{ m: 0 }}>
        {spec.label}
      </Typography>
      <LocalizedField path={`${path}.label`} label="Button text" lang={lang} hint={lang === "en" ? "Leave empty to hide the button." : undefined} />
      {lang === "en" && <LinkField label="Opens" path={`${path}.href`} />}
    </Box>
  );
}

function TextListField({ spec, path, lang }: { spec: Extract<FieldSpec, { kind: "textList" }>; path: string; lang: EditLang }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: path });
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Typography variant="label" component="p" sx={{ m: 0 }}>
        {spec.label}
      </Typography>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 2, alignItems: "start" }}>
          <LocalizedField path={`${path}.${index}`} label={`${spec.itemLabel} ${index + 1}`} lang={lang} />
          <IconButton label={`Remove ${spec.itemLabel.toLowerCase()} ${index + 1}`} onClick={() => remove(index)} sx={{ mt: 6 }}>
            <DeleteOutlineOutlined />
          </IconButton>
        </Box>
      ))}
      <Box>
        <Button variant="secondary" size="sm" startIcon={<AddOutlined />} disabled={fields.length >= spec.max} onClick={() => append({ en: "", hi: "" })}>
          Add {spec.itemLabel.toLowerCase()}
        </Button>
      </Box>
    </Box>
  );
}

function ListField({ spec, path, lang }: { spec: Extract<FieldSpec, { kind: "list" }>; path: string; lang: EditLang }) {
  const { tokens } = useTheme();
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: path });
  const error = useError(path);
  const min = spec.min ?? 0;

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="label" component="p" sx={{ m: 0 }}>
          {spec.label}
        </Typography>
        {spec.hint && (
          <Typography variant="body2" sx={{ m: 0, mt: 1, color: "text.secondary" }}>
            {spec.hint}
          </Typography>
        )}
      </Box>
      {error && (
        <Typography variant="body2" role="alert" sx={{ color: "error.main" }}>
          {error}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, bgcolor: tokens.neutral[25] }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 4, py: 2, borderBottom: `1px solid ${tokens.neutral[200]}` }}>
            <Typography sx={{ fontWeight: 600, flex: 1 }}>
              {spec.itemLabel} {index + 1}
              <ItemSummary path={`${path}.${index}`} />
            </Typography>
            <IconButton label={`Move ${spec.itemLabel.toLowerCase()} ${index + 1} up`} size="sm" disabled={index === 0} onClick={() => move(index, index - 1)}>
              <ArrowUpwardOutlined fontSize="small" />
            </IconButton>
            <IconButton label={`Move ${spec.itemLabel.toLowerCase()} ${index + 1} down`} size="sm" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)}>
              <ArrowDownwardOutlined fontSize="small" />
            </IconButton>
            <IconButton label={`Remove ${spec.itemLabel.toLowerCase()} ${index + 1}`} size="sm" disabled={fields.length <= min} onClick={() => remove(index)}>
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ p: 4, display: "grid", gap: 5 }}>
            <FieldList fields={spec.fields} base={`${path}.${index}`} lang={lang} />
          </Box>
        </Box>
      ))}
      <Box>
        <Button variant="secondary" size="sm" startIcon={<AddOutlined />} disabled={fields.length >= spec.max} onClick={() => append(spec.create() as object)}>
          Add {spec.itemLabel.toLowerCase()}
        </Button>
      </Box>
    </Box>
  );
}

/** " · Glow facials" after "Banner 2", from the item's title or question. */
function ItemSummary({ path }: { path: string }) {
  const item = useWatch({ name: path }) as Record<string, unknown> | undefined;
  const text = [item?.title, item?.question, item?.value].find((value): value is { en: string; hi: string } => Boolean(value && typeof value === "object" && "en" in value));
  const label = text ? pick(text, "en") : typeof item?.name === "string" ? item.name : "";
  return label ? (
    <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
      {" · "}
      {label.slice(0, 60)}
    </Box>
  ) : null;
}

/** Services chosen from the catalogue, in order. */
function ServicesField({ label, hint, path }: { label: string; hint?: string; path: string }) {
  const { control } = useFormContext();
  const catalog = useQuery(catalogQuery).data;
  const services = catalog?.services ?? [];
  const nameOf = (slug: string) => services.find((service) => service.slug === slug)?.name.en ?? slug;

  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => {
        const chosen = (field.value as string[]) ?? [];
        const set = (next: string[]) => field.onChange(next);
        return (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Typography variant="label" component="p" sx={{ m: 0 }}>
              {label}
            </Typography>
            {hint && (
              <Typography variant="body2" sx={{ m: 0, mt: -2, color: "text.secondary" }}>
                {hint}
              </Typography>
            )}
            {chosen.length > 0 && (
              <Box component="ol" sx={{ m: 0, pl: 5, display: "grid", gap: 1 }}>
                {chosen.map((slug, index) => (
                  <li key={slug}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ flex: 1 }}>{nameOf(slug)}</Typography>
                      <IconButton label={`Move ${nameOf(slug)} up`} size="sm" disabled={index === 0} onClick={() => set(chosen.map((item, i) => (i === index - 1 ? slug : i === index ? (chosen[index - 1] ?? item) : item)))}>
                        <ArrowUpwardOutlined fontSize="small" />
                      </IconButton>
                      <IconButton label={`Remove ${nameOf(slug)}`} size="sm" onClick={() => set(chosen.filter((item) => item !== slug))}>
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </Box>
                  </li>
                ))}
              </Box>
            )}
            <SelectField
              label="Add a service"
              optional
              value=""
              onChange={(slug: string) => set([...chosen, slug].slice(0, 24))}
              options={services.filter((service) => !chosen.includes(service.slug)).map((service) => ({ value: service.slug, label: `${service.name.en} (${service.gender === "men" ? "Men" : "Women"})` }))}
            />
          </Box>
        );
      }}
    />
  );
}

const ICONS = [
  { value: "verified", label: "Verified" },
  { value: "shield", label: "Shield" },
  { value: "clock", label: "Clock" },
  { value: "price", label: "Rupee" },
  { value: "star", label: "Star" },
  { value: "home", label: "Home" },
  { value: "spa", label: "Spa" },
  { value: "sparkle", label: "Sparkle" },
  { value: "heart", label: "Heart" },
  { value: "leaf", label: "Flower" },
  { value: "location", label: "Location" },
  { value: "phone", label: "Phone" },
  { value: "calendar", label: "Calendar" },
  { value: "wallet", label: "Wallet" },
  { value: "support", label: "Support" },
  { value: "hygiene", label: "Hygiene" },
  { value: "lock", label: "Lock" },
  { value: "thumb", label: "Thumbs up" },
  { value: "brush", label: "Brush" },
  { value: "bolt", label: "Fast" },
] as const;
