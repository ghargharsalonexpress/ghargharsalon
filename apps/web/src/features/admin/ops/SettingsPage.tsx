import { useState } from "react";
import { type Settings, settingsSchema, type SettingsResponse } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ActionBar, Button, Checkbox, ConfirmDialog, InlineAlert, PageHeader, TextField, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { settingsHistoryQuery, settingsQuery, useSaveSettings } from "./api";
import { when } from "./format";
import { Section } from "./parts";

/** Every number on the form, as typed. Money is shown in rupees and rates in percent; the API keeps paise and basis points. */
interface Form {
  platformFee: string;
  commission: string;
  gstRate: string;
  pricesIncludeGst: boolean;
  maxQuantity: string;
  radiusKm: string;
  offersPerRound: string;
  acceptWindow: string;
  searchTimeout: string;
  stalePresence: string;
  open: string;
  close: string;
  unpaidExpiry: string;
  lateThreshold: string;
  noShowWait: string;
  otpAttempts: string;
  cancelAfterAccept: string;
  noShowFee: string;
  cancelWhileSearching: string;
  freeCancelWhenLate: boolean;
  areas: Array<{ name: string; points: string }>;
}

const toForm = (s: Settings): Form => ({
  platformFee: String(s.pricing.platformFeePaise / 100),
  commission: String(s.pricing.commissionBps / 100),
  gstRate: String(s.pricing.gstRateBps / 100),
  pricesIncludeGst: s.pricing.pricesIncludeGst,
  maxQuantity: String(s.pricing.maxQuantityPerLine),
  radiusKm: String(s.matching.radiusKm),
  offersPerRound: String(s.matching.offersPerRound),
  acceptWindow: String(s.matching.acceptWindowSeconds),
  searchTimeout: String(s.matching.searchTimeoutSeconds),
  stalePresence: String(s.matching.stalePresenceSeconds),
  open: s.operations.serviceHours.open,
  close: s.operations.serviceHours.close,
  unpaidExpiry: String(s.operations.unpaidExpiryMinutes),
  lateThreshold: String(s.operations.lateThresholdMinutes),
  noShowWait: String(s.operations.noShowWaitMinutes),
  otpAttempts: String(s.operations.otpAttempts),
  cancelAfterAccept: String(s.fees.cancelAfterAcceptPaise / 100),
  noShowFee: String(s.fees.noShowPaise / 100),
  cancelWhileSearching: String(s.fees.cancelWhileSearchingPaise / 100),
  freeCancelWhenLate: s.fees.freeCancelWhenProfessionalLate,
  // People copy coordinates from Google Maps as "lat, lng"; the API stores [lng, lat].
  // The closing corner (same as the first) is added back on save, so it isn't shown twice.
  areas: s.operations.activeAreas.map((area) => {
    const ring = area.polygon;
    const first = ring[0];
    const last = ring.at(-1);
    const open = ring.length > 1 && first && last && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
    return { name: area.name, points: open.map(([lng, lat]) => `${lat}, ${lng}`).join("\n") };
  }),
});

const num = (value: string) => (value.trim() === "" ? Number.NaN : Number(value.replace(/[,₹%\s]/g, "")));
const hundredths = (value: string) => Math.round(num(value) * 100);

function parsePolygon(text: string): Array<[number, number]> {
  const points = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [lat, lng] = line.split(/[,\s]+/).map(Number);
      return [lng ?? Number.NaN, lat ?? Number.NaN] as [number, number];
    });
  const first = points[0];
  const last = points.at(-1);
  // Close the ring for the person typing it.
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) points.push([first[0], first[1]]);
  return points;
}

/** The form's values over the saved settings: what the form doesn't show (the widening search, road distance) is kept as saved. */
const fromForm = (f: Form, base: Settings): Settings => ({
  pricing: { gstRateBps: hundredths(f.gstRate), pricesIncludeGst: f.pricesIncludeGst, platformFeePaise: hundredths(f.platformFee), commissionBps: hundredths(f.commission), maxQuantityPerLine: num(f.maxQuantity) },
  matching: { ...base.matching, radiusKm: num(f.radiusKm), offersPerRound: num(f.offersPerRound), acceptWindowSeconds: num(f.acceptWindow), searchTimeoutSeconds: num(f.searchTimeout), stalePresenceSeconds: num(f.stalePresence) },
  operations: {
    serviceHours: { open: f.open, close: f.close },
    unpaidExpiryMinutes: num(f.unpaidExpiry),
    lateThresholdMinutes: num(f.lateThreshold),
    noShowWaitMinutes: num(f.noShowWait),
    otpAttempts: num(f.otpAttempts),
    activeAreas: f.areas.map((area) => ({ name: area.name.trim(), polygon: parsePolygon(area.points) })),
  },
  fees: { cancelAfterAcceptPaise: hundredths(f.cancelAfterAccept), noShowPaise: hundredths(f.noShowFee), cancelWhileSearchingPaise: hundredths(f.cancelWhileSearching), freeCancelWhenProfessionalLate: f.freeCancelWhenLate },
});

/** Field ↔ settings path, for errors and the change preview. */
const FIELDS: Array<{ key: Exclude<keyof Form, "areas" | "pricesIncludeGst" | "freeCancelWhenLate">; path: string; unit: "rupees" | "percent" | "km" | "seconds" | "minutes" | "count" | "time" }> = [
  { key: "platformFee", path: "pricing.platformFeePaise", unit: "rupees" },
  { key: "commission", path: "pricing.commissionBps", unit: "percent" },
  { key: "gstRate", path: "pricing.gstRateBps", unit: "percent" },
  { key: "maxQuantity", path: "pricing.maxQuantityPerLine", unit: "count" },
  { key: "radiusKm", path: "matching.radiusKm", unit: "km" },
  { key: "offersPerRound", path: "matching.offersPerRound", unit: "count" },
  { key: "acceptWindow", path: "matching.acceptWindowSeconds", unit: "seconds" },
  { key: "searchTimeout", path: "matching.searchTimeoutSeconds", unit: "seconds" },
  { key: "stalePresence", path: "matching.stalePresenceSeconds", unit: "seconds" },
  { key: "open", path: "operations.serviceHours.open", unit: "time" },
  { key: "close", path: "operations.serviceHours.close", unit: "time" },
  { key: "unpaidExpiry", path: "operations.unpaidExpiryMinutes", unit: "minutes" },
  { key: "lateThreshold", path: "operations.lateThresholdMinutes", unit: "minutes" },
  { key: "noShowWait", path: "operations.noShowWaitMinutes", unit: "minutes" },
  { key: "otpAttempts", path: "operations.otpAttempts", unit: "count" },
  { key: "cancelAfterAccept", path: "fees.cancelAfterAcceptPaise", unit: "rupees" },
  { key: "noShowFee", path: "fees.noShowPaise", unit: "rupees" },
  { key: "cancelWhileSearching", path: "fees.cancelWhileSearchingPaise", unit: "rupees" },
];

/** /admin/settings (plan W16): business rules, validated, previewed and versioned. New values apply to new bookings. */
export function SettingsPage() {
  const { t } = useTranslation("admin");
  const settings = useQuery(settingsQuery);
  usePageMeta(t("settings.title"));

  if (settings.isError && !settings.data) return <InlineAlert tone="danger">{errorText(t, settings.error)}</InlineAlert>;
  if (!settings.data) {
    return (
      <>
        <PageHeader title={t("settings.title")} />
        <Box aria-busy sx={{ display: "grid", gap: 4 }}>
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={220} />
        </Box>
      </>
    );
  }
  // A new version (saved here or elsewhere) starts the form afresh.
  return <SettingsForm key={settings.data.version} saved={settings.data} onReload={() => void settings.refetch()} />;
}

function SettingsForm({ saved, onReload }: { saved: SettingsResponse; onReload: () => void }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const save = useSaveSettings();
  const history = useQuery(settingsHistoryQuery);
  const [form, setForm] = useState<Form>(() => toForm(saved.settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [changes, setChanges] = useState<Array<{ label: string; before: string; after: string }> | null>(null);
  const [pending, setPending] = useState<Settings | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const show = (unit: (typeof FIELDS)[number]["unit"], value: string) =>
    unit === "rupees" ? `₹${value}` : unit === "percent" ? `${value}%` : unit === "km" ? `${value} km` : unit === "seconds" ? t("settings.secondsValue", { value }) : unit === "minutes" ? t("settings.minutesValue", { value }) : value;

  const review = () => {
    const candidate = fromForm(form, saved.settings);
    const result = settingsSchema.safeParse(candidate);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        const areaMatch = /^operations\.activeAreas\.(\d+)/.exec(path);
        next[areaMatch ? `area.${areaMatch[1]}` : path] ??= issue.message;
      }
      setErrors(next);
      toast(t("settings.fixErrors"));
      return;
    }
    setErrors({});
    const before = toForm(saved.settings);
    const list = FIELDS.filter((field) => num(before[field.key]) !== num(form[field.key]) && before[field.key] !== form[field.key]).map((field) => ({
      label: t(`settings.fields.${field.key}`),
      before: show(field.unit, before[field.key]),
      after: show(field.unit, form[field.key]),
    }));
    if (before.pricesIncludeGst !== form.pricesIncludeGst) list.push({ label: t("settings.fields.pricesIncludeGst"), before: before.pricesIncludeGst ? t("settings.yes") : t("settings.no"), after: form.pricesIncludeGst ? t("settings.yes") : t("settings.no") });
    if (before.freeCancelWhenLate !== form.freeCancelWhenLate) list.push({ label: t("settings.fields.freeCancelWhenLate"), before: before.freeCancelWhenLate ? t("settings.yes") : t("settings.no"), after: form.freeCancelWhenLate ? t("settings.yes") : t("settings.no") });
    if (JSON.stringify(before.areas) !== JSON.stringify(form.areas)) list.push({ label: t("settings.fields.areas"), before: t("settings.areaCount", { count: before.areas.length }), after: t("settings.areaCount", { count: form.areas.length }) });
    if (list.length === 0) {
      toast(t("settings.noChanges"));
      return;
    }
    setPending(result.data);
    setChanges(list);
  };

  const confirm = () => {
    if (!pending) return;
    save.mutate(
      { version: saved.version, settings: pending },
      {
        onSuccess: () => {
          toast(t("settings.saved"));
          setChanges(null);
        },
        onError: () => setChanges(null),
      },
    );
  };

  const field = (key: (typeof FIELDS)[number]["key"], options: { prefix?: string; suffix?: string; hint?: string; type?: string } = {}) => {
    const path = FIELDS.find((item) => item.key === key)?.path ?? key;
    return (
      <TextField
        label={t(`settings.fields.${key}`)}
        hint={options.hint}
        type={options.type ?? "text"}
        inputMode={options.type === "time" ? undefined : "decimal"}
        value={form[key]}
        onChange={(event) => set(key, event.target.value)}
        name={key}
        error={fieldText(t, errors[path])}
        startAdornment={options.prefix ? <Typography component="span" sx={{ color: "text.secondary", pr: 1 }}>{options.prefix}</Typography> : undefined}
        endAdornment={options.suffix ? <Typography component="span" sx={{ color: "text.secondary", pl: 1 }}>{options.suffix}</Typography> : undefined}
      />
    );
  };
  const grid = { display: "grid", gap: 5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" } } as const;
  const conflict = isApiError(save.error) && save.error.code === "VERSION_CONFLICT";

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description", { version: saved.version, time: when(saved.updatedAt) })}
        actions={
          <Button onClick={review} loading={save.isPending}>
            {t("settings.review")}
          </Button>
        }
      />
      <Box sx={{ display: "grid", gap: 6 }}>
        {save.isError &&
          (conflict ? (
            <InlineAlert
              tone="warning"
              action={
                <Button variant="tertiary" size="sm" onClick={onReload}>
                  {t("settings.reload")}
                </Button>
              }
            >
              {t("settings.conflict")}
            </InlineAlert>
          ) : (
            <InlineAlert tone="danger">{errorText(t, save.error)}</InlineAlert>
          ))}

        <Section id="settings-pricing" title={t("settings.pricing")}>
          <Box sx={grid}>
            {field("platformFee", { prefix: "₹", hint: t("settings.hints.platformFee") })}
            {field("commission", { suffix: "%", hint: t("settings.hints.commission") })}
            {field("gstRate", { suffix: "%", hint: t("settings.hints.gstRate") })}
            {field("maxQuantity", { hint: t("settings.hints.maxQuantity") })}
          </Box>
          <Box sx={{ mt: 4 }}>
            <Checkbox label={t("settings.fields.pricesIncludeGst")} checked={form.pricesIncludeGst} onChange={(checked) => set("pricesIncludeGst", checked)} name="pricesIncludeGst" />
          </Box>
        </Section>

        <Section id="settings-matching" title={t("settings.matching")}>
          <Box sx={grid}>
            {field("radiusKm", { suffix: "km", hint: t("settings.hints.radiusKm") })}
            {field("offersPerRound", { hint: t("settings.hints.offersPerRound") })}
            {field("acceptWindow", { suffix: t("settings.sec"), hint: t("settings.hints.acceptWindow") })}
            {field("searchTimeout", { suffix: t("settings.sec"), hint: t("settings.hints.searchTimeout") })}
            {field("stalePresence", { suffix: t("settings.sec"), hint: t("settings.hints.stalePresence") })}
          </Box>
        </Section>

        <Section id="settings-hours" title={t("settings.hours")}>
          <Box sx={grid}>
            {field("open", { type: "time", hint: t("settings.hints.open") })}
            {field("close", { type: "time", hint: t("settings.hints.close") })}
            {field("unpaidExpiry", { suffix: t("settings.min"), hint: t("settings.hints.unpaidExpiry") })}
            {field("lateThreshold", { suffix: t("settings.min"), hint: t("settings.hints.lateThreshold") })}
            {field("noShowWait", { suffix: t("settings.min"), hint: t("settings.hints.noShowWait") })}
            {field("otpAttempts", { hint: t("settings.hints.otpAttempts") })}
          </Box>
          <Typography variant="h3" component="h3" sx={{ mt: 8, mb: 2, typography: "label" }}>
            {t("settings.areas")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4, maxWidth: "72ch" }}>
            {t("settings.areasHelp")}
          </Typography>
          <Box sx={{ display: "grid", gap: 4 }}>
            {form.areas.map((area, index) => (
              <Box key={index} sx={{ p: 4, border: `1px solid ${errors[`area.${index}`] ? tokens.semantic.danger.fg : tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, display: "grid", gap: 4 }}>
                <TextField
                  label={t("settings.areaName")}
                  value={area.name}
                  onChange={(event) => set("areas", form.areas.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                  name={`area-${index}-name`}
                />
                <TextField
                  label={t("settings.areaPoints")}
                  hint={t("settings.areaPointsHint", { count: parsePolygon(area.points).length - 1 })}
                  multiline
                  minRows={4}
                  value={area.points}
                  onChange={(event) => set("areas", form.areas.map((item, i) => (i === index ? { ...item, points: event.target.value } : item)))}
                  name={`area-${index}-points`}
                  error={errors[`area.${index}`] ? t("settings.areaInvalid") : undefined}
                />
                <Box>
                  <Button variant="tertiary" size="sm" onClick={() => set("areas", form.areas.filter((_, i) => i !== index))}>
                    {t("settings.removeArea")}
                  </Button>
                </Box>
              </Box>
            ))}
            {form.areas.length === 0 && <InlineAlert tone="warning">{t("settings.noAreas")}</InlineAlert>}
            <Box>
              <Button variant="secondary" startIcon={<AddOutlined />} onClick={() => set("areas", [...form.areas, { name: "", points: "" }])} disabled={form.areas.length >= 20}>
                {t("settings.addArea")}
              </Button>
            </Box>
          </Box>
        </Section>

        <Section id="settings-fees" title={t("settings.fees")}>
          <Box sx={grid}>
            {field("cancelWhileSearching", { prefix: "₹", hint: t("settings.hints.cancelWhileSearching") })}
            {field("cancelAfterAccept", { prefix: "₹", hint: t("settings.hints.cancelAfterAccept") })}
            {field("noShowFee", { prefix: "₹", hint: t("settings.hints.noShowFee") })}
          </Box>
          <Box sx={{ mt: 4 }}>
            <Checkbox label={t("settings.fields.freeCancelWhenLate")} checked={form.freeCancelWhenLate} onChange={(checked) => set("freeCancelWhenLate", checked)} name="freeCancelWhenLate" />
          </Box>
        </Section>

        <Section id="settings-history" title={t("settings.history")}>
          {history.data && history.data.length > 0 ? (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2 }}>
              {history.data.map((row) => (
                <li key={row.version}>
                  <Typography variant="body2">{t("settings.historyRow", { version: row.version, time: when(row.changedAt) })}</Typography>
                </li>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>{t("settings.noHistory")}</Typography>
          )}
        </Section>
      </Box>

      <ActionBar>
        <Button size="lg" fullWidth onClick={review} loading={save.isPending}>
          {t("settings.review")}
        </Button>
      </ActionBar>

      <ConfirmDialog
        open={changes !== null}
        onClose={() => setChanges(null)}
        onConfirm={confirm}
        title={t("settings.confirmTitle")}
        consequence={t("settings.confirmBody")}
        confirmLabel={t("settings.save")}
        tone="primary"
        loading={save.isPending}
      >
        <Box component="ul" sx={{ m: 0, pl: 5, display: "grid", gap: 1 }}>
          {(changes ?? []).map((change) => (
            <li key={change.label}>
              <Typography variant="body2">{t("settings.changeLine", change)}</Typography>
            </li>
          ))}
        </Box>
      </ConfirmDialog>
    </>
  );
}
