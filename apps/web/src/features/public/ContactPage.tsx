import { useState } from "react";
import { type ContactInput, contactSchema, type z } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
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
import { clockText, useInfo } from "./info";
import { usePageMeta } from "./usePageMeta";

type ContactData = z.output<typeof contactSchema>;

/** Contact (plan W17): stored for the admin, emailed to both sides, answered within a working day. */
export function ContactPage() {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<unknown>(null);
  const info = useInfo();
  const send = useMutation({ mutationFn: (input: ContactInput) => api.post<Record<string, never>>("/v1/contact", input) });

  usePageMeta(t("meta.contactTitle"), t("contact.lead"));

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

  const phoneHref = `tel:${brand.supportPhone.replace(/\s/g, "")}`;

  return (
    <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, py: { xs: 8, md: 16 } }}>
      <Box sx={{ display: "grid", gap: { xs: 10, md: 16 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 560px) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Box>
          <Typography variant="h1">{t("contact.title")}</Typography>
          <Typography sx={{ mt: 3, color: "text.secondary" }}>{t("contact.lead")}</Typography>

          {sentTo ? (
            <Box role="status" sx={{ mt: 8, p: { xs: 5, md: 6 }, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, display: "grid", gap: 3, justifyItems: "start" }}>
              <Box aria-hidden sx={{ width: 48, height: 48, borderRadius: `${tokens.radius.full}px`, bgcolor: tokens.semantic.success.bg, color: tokens.semantic.success.fg, display: "grid", placeItems: "center" }}>
                <MarkEmailReadOutlined />
              </Box>
              <Typography variant="h2" sx={{ typography: "h3" }}>
                {t("contact.sentTitle")}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("contact.sentBody", { email: sentTo })}</Typography>
              <Button variant="secondary" onClick={() => setSentTo(null)} sx={{ mt: 2 }}>
                {t("contact.another")}
              </Button>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={onSubmit} sx={{ mt: 8, display: "grid", gap: 5 }}>
              {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
              <TextField label={t("contact.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, errors.name?.message)} />
              <TextField label={t("contact.email")} type="email" inputMode="email" autoComplete="email" {...fieldProps(register("email"))} error={fieldText(t, errors.email?.message)} />
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneField
                    label={t("contact.phone")}
                    optional
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={fieldText(t, errors.phone?.message)}
                  />
                )}
              />
              <TextField
                label={t("contact.message")}
                hint={t("contact.messageHint")}
                multiline
                minRows={5}
                {...fieldProps(register("message"))}
                error={fieldText(t, errors.message?.message)}
              />
              {/* Honeypot: hidden from people and screen readers; bots that fill it are ignored. */}
              <VisuallyHidden aria-hidden>
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
                </label>
              </VisuallyHidden>
              <Box>
                <Button type="submit" size="lg" loading={send.isPending}>
                  {t("contact.submit")}
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Box component="aside" aria-labelledby="contact-other" sx={{ pt: { md: 2 }, borderTop: { xs: `1px solid ${tokens.neutral[200]}`, md: 0 }, mt: { xs: 0, md: 14 } }}>
          <Typography id="contact-other" variant="h2" sx={{ typography: "h3", pt: { xs: 8, md: 0 } }}>
            {t("contact.orTitle")}
          </Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 4, display: "grid", gap: 3 }}>
            <li>
              <Link href={phoneHref}>{t("contact.callUs", { phone: brand.supportPhone })}</Link>
            </li>
            <li>
              <Link href={`mailto:${brand.supportEmail}`}>{t("contact.emailUs", { email: brand.supportEmail })}</Link>
            </li>
          </Box>
          <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
            {t("contact.hours", { open: clockText(info.serviceHours.open, i18n.language), close: clockText(info.serviceHours.close, i18n.language) })}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
