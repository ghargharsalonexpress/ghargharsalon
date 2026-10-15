import { useState } from "react";
import { type ForgotPasswordData, type ForgotPasswordInput, forgotPasswordSchema } from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import MarkEmailReadOutlined from "@mui/icons-material/MarkEmailReadOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button, InlineAlert, Link, TextField } from "@/design-system";
import { SiteAuthShell as AuthShell } from "@/features/site/SiteAuthShell";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useForgotPassword } from "./api";

/** Team login's reset path, step 1 (admins only). The answer never reveals whether an account exists. */
export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const { tokens } = useTheme();
  const [params] = useSearchParams();
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordInput, unknown, ForgotPasswordData>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: params.get("email") ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await forgot.mutateAsync(values);
      setSentTo(values.email);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["email"]));
    }
  });

  if (sentTo) {
    return (
      <AuthShell title={t("forgot.sentTitle")}>
        <Box sx={{ display: "grid", gap: 4 }}>
          <Box
            aria-hidden
            sx={{ width: 48, height: 48, borderRadius: `${tokens.radius.full}px`, bgcolor: tokens.semantic.success.bg, color: tokens.semantic.success.fg, display: "grid", placeItems: "center" }}
          >
            <MarkEmailReadOutlined />
          </Box>
          <Typography role="status">{t("forgot.sentBody", { email: sentTo })}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("forgot.sentHint")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 2 }}>
            <Button to={`/admin/login?email=${encodeURIComponent(sentTo)}`} size="lg">
              {t("forgot.back")}
            </Button>
            <Button
              variant="tertiary"
              size="lg"
              onClick={() => {
                reset({ email: "" });
                setSentTo(null);
              }}
            >
              {t("forgot.otherEmail")}
            </Button>
          </Box>
        </Box>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("forgot.title")} description={t("forgot.description")}>
      <Box component="form" noValidate onSubmit={onSubmit} sx={{ display: "grid", gap: 5 }}>
        {formError ? <InlineAlert tone="danger">{errorText(t, formError)}</InlineAlert> : null}
        <TextField label={t("forgot.email")} type="email" inputMode="email" autoComplete="email" {...fieldProps(register("email"))} error={fieldText(t, errors.email?.message)} />
        <Button type="submit" size="lg" fullWidth loading={forgot.isPending}>
          {t("forgot.submit")}
        </Button>
      </Box>
      <Typography sx={{ mt: 8, textAlign: "center" }}>
        <Link to="/admin/login" standalone>
          {t("forgot.back")}
        </Link>
      </Typography>
    </AuthShell>
  );
}
