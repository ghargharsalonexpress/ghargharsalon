import { type ReactNode, useState } from "react";
import { type ContactInput, contactSchema, type SectionOf, type z } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import WhatsApp from "@mui/icons-material/WhatsApp";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Button, InlineAlert, Link, PhoneField, TextField, VisuallyHidden } from "@/design-system";
import { api } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useSite } from "../api";
import { telHref, useText, useTextVariables, whatsappHref } from "../text";
import { SectionHeading, SectionShell } from "./parts";
import { titleId, useTone } from "./tone";

type ContactData = z.output<typeof contactSchema>;

/** The contact form (W17) beside the ways to reach us; messages land in Admin → Messages. */
export function ContactFormSection({ section }: { section: SectionOf<"contactForm"> }) {
  const { tokens } = useTheme();
  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 10, md: 14 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: section.showDetails ? "minmax(0, 7fr) minmax(0, 5fr)" : "minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box sx={{ p: { xs: 5, md: 8 }, borderRadius: `${tokens.radius.lg}px`, border: `1px solid ${tokens.neutral[200]}`, bgcolor: tokens.neutral[0], color: tokens.neutral[900], boxShadow: "0 12px 32px rgba(31,28,25,0.06)" }}>
          <SectionHeading section={{ ...section, tone: "plain" }} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          <ContactForm />
        </Box>
        {section.showDetails && <ContactDetails />}
      </Box>
    </SectionShell>
  );
}

function ContactForm() {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<unknown>(null);
  const send = useMutation({ mutationFn: (input: ContactInput) => api.post<Record<string, never>>("/v1/contact", input) });

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: standardSchemaResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", phone: "", message: "", website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await send.mutateAsync({ ...values, locale: i18n.language === "hi" ? "hi" : "en" });
      setSentTo(values.email);
      reset();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["name", "email", "phone", "message"]));
    }
  });

  if (sentTo) {
    return (
      <Box role="status" sx={{ display: "grid", gap: 3, justifyItems: "start" }}>
        <Box aria-hidden sx={{ width: 48, height: 48, borderRadius: `${tokens.radius.full}px`, bgcolor: tokens.semantic.success.bg, color: tokens.semantic.success.fg, display: "grid", placeItems: "center" }}>
          <MarkEmailReadOutlined />
        </Box>
        <Typography variant="h3" component="h3">
          {t("contact.sentTitle")}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>{t("contact.sentBody", { email: sentTo })}</Typography>
        <Button variant="secondary" onClick={() => setSentTo(null)} sx={{ mt: 2 }}>
          {t("contact.another")}
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
      {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
      <Box sx={{ display: "grid", gap: 5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <TextField label={t("contact.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, errors.name?.message)} />
        <TextField label={t("contact.email")} type="email" inputMode="email" autoComplete="email" {...fieldProps(register("email"))} error={fieldText(t, errors.email?.message)} />
      </Box>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField label={t("contact.phone")} optional name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} error={fieldText(t, errors.phone?.message)} />
        )}
      />
      <TextField label={t("contact.message")} hint={t("contact.messageHint")} multiline minRows={5} {...fieldProps(register("message"))} error={fieldText(t, errors.message?.message)} />
      {/* Honeypot: hidden from people and screen readers; bots that fill it are ignored. */}
      <VisuallyHidden aria-hidden>
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </VisuallyHidden>
      <Box>
        <Button type="submit" size="lg" loading={send.isPending} sx={{ borderRadius: 999, px: 8 }}>
          {t("contact.submit")}
        </Button>
      </Box>
    </Box>
  );
}

/** Phone, WhatsApp, email, hours and address from Brand & theme. */
function ContactDetails() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const { site } = useSite();
  const text = useText();
  const vars = useTextVariables();
  const phone = site.brand.supportPhone;
  const whatsapp = whatsappHref(site.brand.whatsapp);
  const address = text(site.brand.address);

  type Row = { icon: ReactNode; label: string; value: ReactNode };
  const rows = ([
    phone && { icon: <PhoneOutlined />, label: t("site.callUs"), value: <Link href={telHref(phone)}>{phone}</Link> },
    whatsapp && { icon: <WhatsApp />, label: t("site.whatsapp"), value: <Link href={whatsapp}>{t("site.chatOnWhatsapp")}</Link> },
    site.brand.supportEmail && { icon: <EmailOutlined />, label: t("site.emailUs"), value: <Link href={`mailto:${site.brand.supportEmail}`}>{site.brand.supportEmail}</Link> },
    { icon: <AccessTimeOutlined />, label: t("site.hours"), value: t("contact.hours", { open: vars.open, close: vars.close }) },
    address && { icon: <PlaceOutlined />, label: t("site.address"), value: address },
  ] as Array<Row | false | "">).filter((row): row is Row => Boolean(row));

  return (
    <Box component="aside" aria-labelledby="contact-details" sx={{ p: { xs: 5, md: 8 }, borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.neutral[900], color: tokens.neutral[0], "& a": { color: tokens.neutral[0], wordBreak: "break-word" } }}>
      <Typography id="contact-details" variant="h3" component="h2" sx={{ color: tokens.neutral[0] }}>
        {t("contact.orTitle")}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 6, display: "grid", gap: 5 }}>
        {rows.map((row) => (
          <Box component="li" key={row.label} sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
            <Box aria-hidden sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: `${tokens.radius.md}px`, display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,0.1)", color: tokens.accent[200] }}>
              {row.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" component="p" sx={{ m: 0, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {row.label}
              </Typography>
              <Typography component="div" sx={{ mt: 0.5, fontWeight: 500 }}>
                {row.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** A Google Form can be shown inside the page (?embedded=true); other form links only open. */
function embeddableForm(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "docs.google.com" || !parsed.pathname.startsWith("/forms/")) return null;
    parsed.searchParams.set("embedded", "true");
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * The professionals' application (plan A3, W11): the Google Form from Brand & theme inside
 * the page, the steps beside it. Without a form link, applications go to support by email.
 */
export function ProApplicationSection({ section }: { section: SectionOf<"proApplication"> }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  const text = useText();
  const { site } = useSite();
  const formUrl = site.proFormUrl || brand.professionalFormUrl;
  const embedded = formUrl ? embeddableForm(formUrl) : null;
  const email = site.brand.supportEmail;

  return (
    <SectionShell section={section}>
      <Box sx={{ display: "grid", gap: { xs: 10, md: 12 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: section.steps.length ? "minmax(0, 7fr) minmax(0, 4fr)" : "minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box>
          <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {embedded ? (
            <>
              <Box
                component="iframe"
                src={embedded}
                title={text(section.title) || t("join.formTitle")}
                sx={{ display: "block", width: "100%", height: "min(85vh, 1100px)", minHeight: 560, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.neutral[0] }}
              />
              <Button variant="secondary" href={formUrl} target="_blank" rel="noopener noreferrer" sx={{ mt: 4 }}>
                {t("join.formNewTab")}
              </Button>
            </>
          ) : formUrl ? (
            <Button size="lg" href={formUrl} target="_blank" rel="noopener noreferrer">
              {t("join.cta")}
            </Button>
          ) : (
            <Button size="lg" href={`mailto:${email}?subject=${encodeURIComponent(t("join.emailSubject"))}`}>
              {t("join.emailCta", { email })}
            </Button>
          )}
          {text(section.note) && (
            <Typography variant="body2" sx={{ mt: 4, color: tone.muted }}>
              {text(section.note)}
            </Typography>
          )}
        </Box>

        {section.steps.length > 0 && (
          <Box component="aside" aria-labelledby={`${titleId(section)}-steps`} sx={{ position: { md: "sticky" }, top: 100, p: { xs: 5, md: 6 }, borderRadius: `${tokens.radius.lg}px`, bgcolor: tokens.neutral[0], border: `1px solid ${tokens.accent[200]}`, color: tokens.neutral[900] }}>
            <Typography id={`${titleId(section)}-steps`} variant="h3" component="h3">
              {text(section.stepsTitle) || t("join.stepsTitle")}
            </Typography>
            <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 5, display: "grid", gap: 5 }}>
              {section.steps.map((step, index) => (
                <Box component="li" key={index} sx={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 3 }}>
                  <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: tokens.accent[600], color: tokens.neutral[0], fontWeight: 700 }}>
                    {index + 1}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{text(step.title)}</Typography>
                    {text(step.body) && (
                      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                        {text(step.body)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </SectionShell>
  );
}
