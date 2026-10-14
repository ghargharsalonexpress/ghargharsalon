import { useState } from "react";
import { passwordSchema, z } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { homeFor } from "@/app/session";
import { AuthShell, Button, EmptyState, InlineAlert, PasswordField, useToast } from "@/design-system";
import { ApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useResetPassword, useTokenCheck } from "./api";

const formSchema = z.strictObject({ password: passwordSchema });
type FormInput = z.input<typeof formSchema>;
type FormData = z.output<typeof formSchema>;

/**
 * Team login's reset path, step 2 (admins only: customers and professionals log in with an SMS
 * code, ADR-0020).
 * The link is checked first, so an expired one never makes anyone type a password for nothing.
 */
export function ResetPasswordPage() {
  const { t, i18n } = useTranslation("auth");
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const check = useTokenCheck(token);
  const reset = useResetPassword();
  const [formError, setFormError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({ resolver: standardSchemaResolver(formSchema), mode: "onTouched", defaultValues: { password: "" } });

  const title = t("reset.title");

  if (!token || check.isError) {
    const code = check.error instanceof ApiError ? check.error.code : "TOKEN_INVALID";
    const heading = code === "TOKEN_EXPIRED" ? t("reset.expiredTitle") : code === "TOKEN_USED" ? t("reset.usedTitle") : t("reset.invalidTitle");
    const known = !check.error || (check.error instanceof ApiError && ["TOKEN_INVALID", "TOKEN_EXPIRED", "TOKEN_USED", "VALIDATION_FAILED"].includes(check.error.code));
    if (!known) {
      // The API couldn't be reached: offer a retry rather than blaming the link.
      return (
        <AuthShell title={title}>
          <EmptyState
            icon={<LinkOffOutlined />}
            title={t("common:state.somethingWrong")}
            description={errorText(t, check.error)}
            action={<Button onClick={() => void check.refetch()}>{t("common:action.retry")}</Button>}
          />
        </AuthShell>
      );
    }
    // The page's heading is the problem itself, with the one way forward.
    return (
      <AuthShell title={heading} description={t("reset.invalidBody")}>
        <Button to="/forgot-password" size="lg" fullWidth>
          {t("reset.requestNew")}
        </Button>
      </AuthShell>
    );
  }

  if (check.isPending) {
    return (
      <AuthShell title={title}>
        <Box role="status" aria-label={t("reset.checking")} sx={{ display: "grid", gap: 2 }}>
          <Skeleton width="30%" />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} sx={{ mt: 4 }} />
        </Box>
      </AuthShell>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      const { user } = await reset.mutateAsync({ token, password });
      if (user.locale !== i18n.resolvedLanguage) await i18n.changeLanguage(user.locale);
      toast(i18n.getFixedT(user.locale, "auth")("reset.saved"));
      await navigate(homeFor(user), { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["password"]));
    }
  });

  return (
    <AuthShell title={title} description={t("reset.description")}>
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        <PasswordField
          label={t("reset.password")}
          autoComplete="new-password"
          {...fieldProps(register("password"))}
          hint={t("reset.passwordHint")}
          error={fieldText(t, errors.password?.message)}
        />
        <Button type="submit" size="lg" fullWidth loading={reset.isPending}>
          {t("reset.submit")}
        </Button>
      </Box>
    </AuthShell>
  );
}
