import { useState } from "react";
import { type LoginData, type LoginInput, loginSchema } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { homeFor, safeNext } from "@/app/session";
import { AuthShell, Button, InlineAlert, Link, PasswordField, TextField, useToast } from "@/design-system";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useLogin } from "./api";

/**
 * /admin/login: admins keep email + password (ADR-0020). A generic error on mismatch, then
 * back to where they were heading.
 */
export function TeamLoginPage() {
  const { t, i18n } = useTranslation("auth");
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const sessionEnded = params.get("reason") === "expired";
  const login = useLogin();
  const [formError, setFormError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginData>({
    resolver: standardSchemaResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: params.get("email") ?? "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await login.mutateAsync(values);
      // The profile language applies from here on (plan C3), including this greeting.
      if (user.locale !== i18n.resolvedLanguage) await i18n.changeLanguage(user.locale);
      toast(i18n.getFixedT(user.locale, "auth")("login.welcome", { name: user.name.split(" ")[0] }));
      await navigate(next ?? homeFor(user), { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["email", "password"]));
    }
  });

  const typedEmail = (useWatch({ control, name: "email" }) ?? "").trim();
  const forgotLink = `/forgot-password${typedEmail ? `?${new URLSearchParams({ email: typedEmail }).toString()}` : ""}`;

  return (
    <AuthShell title={t("team.title")} description={t("team.description")}>
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? (
          <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert>
        ) : (
          sessionEnded && <InlineAlert tone="info">{t("login.expired")}</InlineAlert>
        )}
        <TextField
          label={t("team.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          {...fieldProps(register("email"))}
          error={fieldText(t, errors.email?.message)}
        />
        <Box>
          <PasswordField
            label={t("team.password")}
            autoComplete="current-password"
            {...fieldProps(register("password"))}
            error={fieldText(t, errors.password?.message)}
          />
          <Box sx={{ mt: 2 }}>
            <Link to={forgotLink} standalone>
              {t("team.forgot")}
            </Link>
          </Box>
        </Box>
        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          {t("team.submit")}
        </Button>
      </Box>
      <Typography sx={{ mt: 8, textAlign: "center", color: "text.secondary" }}>
        {t("team.customerPrompt")} <Link to="/login">{t("team.customerLink")}</Link>
      </Typography>
    </AuthShell>
  );
}
