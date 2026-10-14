import { useState } from "react";
import { type ProfileData, type ProfileInput, profileSchema } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
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
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput, unknown, ProfileData>({
    resolver: standardSchemaResolver(profileSchema),
    mode: "onTouched",
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!isDirty) {
      toast(t("profile.noChanges"));
      return;
    }
    try {
      const { user: saved } = await update.mutateAsync(values);
      reset({ name: saved.name, phone: saved.phone });
      toast(t("profile.saved"));
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["name", "phone"]));
    }
  });

  return (
    <Box sx={{ maxWidth: tokens.container.form }}>
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        <TextField label={t("profile.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, errors.name?.message)} />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              label={t("profile.phone")}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldText(t, errors.phone?.message)}
            />
          )}
        />
        <TextField label={t("profile.email")} value={user?.email ?? ""} disabled hint={t("profile.emailHint")} />
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
