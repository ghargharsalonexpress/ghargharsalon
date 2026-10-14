import { useState } from "react";
import { isLanguage, type SignupData, type SignupInput, signupSchema, V } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Controller, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { homeFor, safeNext } from "@/app/session";
import { AuthShell, Button, InlineAlert, Link, PasswordField, PhoneField, TextField, useToast } from "@/design-system";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useSignup } from "./api";

/** W2: name, phone, email and password only (plan Phase 2 UX). The current language becomes the profile language. */
export function SignupPage() {
  const { t, i18n } = useTranslation("auth");
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const signup = useSignup();
  const [formError, setFormError] = useState<unknown>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<SignupInput, unknown, SignupData>({
    resolver: standardSchemaResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { name: "", phone: "", email: params.get("email") ?? "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const locale = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : undefined;
      const { user } = await signup.mutateAsync({ ...values, locale });
      toast(t("signup.created", { name: user.name.split(" ")[0] }));
      await navigate(next ?? homeFor(user), { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["name", "phone", "email", "password"]));
    }
  });

  const loginLink = (email?: string) => {
    const query = new URLSearchParams({ ...(next ? { next } : {}), ...(email ? { email } : {}) });
    return query.size > 0 ? `/login?${query.toString()}` : "/login";
  };

  const emailError =
    errors.email?.message === V.emailTaken ? (
      <>
        {fieldText(t, V.emailTaken)} <Link to={loginLink(getValues("email"))}>{t("signup.loginInstead")}</Link>
      </>
    ) : (
      fieldText(t, errors.email?.message)
    );

  return (
    <AuthShell title={t("signup.title")} description={t("signup.description")}>
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        <TextField label={t("signup.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, errors.name?.message)} />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              label={t("signup.phone")}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              hint={t("signup.phoneHint")}
              error={fieldText(t, errors.phone?.message)}
            />
          )}
        />
        <TextField label={t("signup.email")} type="email" inputMode="email" autoComplete="email" {...fieldProps(register("email"))} error={emailError} />
        <PasswordField
          label={t("signup.password")}
          autoComplete="new-password"
          {...fieldProps(register("password"))}
          hint={t("signup.passwordHint")}
          error={fieldText(t, errors.password?.message)}
        />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          <Trans
            t={t}
            i18nKey="signup.consent"
            components={{ terms: <Link to="/legal/terms">Terms</Link>, privacy: <Link to="/legal/privacy">Privacy Policy</Link> }}
          />
        </Typography>
        <Button type="submit" size="lg" fullWidth loading={signup.isPending}>
          {t("signup.submit")}
        </Button>
      </Box>
      <Typography sx={{ mt: 8, textAlign: "center", color: "text.secondary" }}>
        {t("signup.haveAccount")} <Link to={loginLink()}>{t("signup.login")}</Link>
      </Typography>
    </AuthShell>
  );
}
