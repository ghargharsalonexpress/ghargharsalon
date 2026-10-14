import { useState } from "react";
import { type ProfileData, type ProfileInput, profileSchema } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/app/session";
import { Button, InlineAlert, LanguageSwitch, PageHeader, PhoneField, TextField, useToast } from "@/design-system";
import { useUpdateProfile } from "@/features/auth/api";
import { useSignOut } from "@/features/auth/useSignOut";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";

/**
 * Customer profile (A7 /account/profile, served at /account), inside the account area. Also where
 * the language preference is kept (W18).
 */
export function ProfilePage() {
  const { t } = useTranslation("account");
  const { tokens } = useTheme();
  const toast = useToast();
  const user = useCurrentUser();
  const update = useUpdateProfile();
  const { signOut, pending: signingOut } = useSignOut();
  const [formError, setFormError] = useState<unknown>(null);
  usePageMeta(t("profile.title"));

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput, unknown, ProfileData>({
    resolver: standardSchemaResolver(profileSchema),
    mode: "onTouched",
    values: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!isDirty) {
      toast(t("profile.noChanges"));
      return;
    }
    try {
      const { user: saved } = await update.mutateAsync(values);
      reset({ name: saved.name, email: saved.email ?? "" });
      toast(t("profile.saved"));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["name", "email"]));
    }
  });

  return (
    <Box sx={{ maxWidth: tokens.container.form }}>
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        <TextField label={t("profile.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, errors.name?.message)} />
        {/* The number is the login (ADR-0020): changing it goes through support. */}
        <PhoneField label={t("profile.phone")} name="phone" value={user?.phone ?? ""} onChange={() => undefined} disabled hint={t("profile.phoneHint")} />
        <TextField
          label={t("profile.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          hint={t("profile.emailHint")}
          {...fieldProps(register("email"))}
          error={fieldText(t, errors.email?.message)}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" size="lg" loading={update.isPending}>
            {t("profile.save")}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 8 }} />
      <LanguageSwitch name="language-profile" variant="full" label={t("profile.language")} />

      <Divider sx={{ my: 8 }} />
      <Button variant="secondary" onClick={signOut} loading={signingOut}>
        {t("common:action.logout")}
      </Button>
    </Box>
  );
}
