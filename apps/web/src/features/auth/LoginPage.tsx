import { useEffect, useState } from "react";
import {
  type CompleteSignupData,
  type CompleteSignupInput,
  completeSignupSchema,
  formatIndianMobile,
  isLanguage,
  LOGIN_CODE_LENGTH,
  type SendCodeInput,
  sendCodeSchema,
  type UserDto,
} from "@brand/shared";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Controller, useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { homeFor, safeNext } from "@/app/session";
import { AuthShell, Button, InlineAlert, Link, OtpInput, PhoneField, TextField, useToast } from "@/design-system";
import { isApiError } from "@/lib/api";
import { errorText, fieldText } from "@/lib/errors";
import { fieldProps } from "@/lib/fieldProps";
import { applyServerErrors } from "@/lib/forms";
import { useNow } from "@/lib/useNow";
import { useCompleteSignup, useSendCode, useVerifyCode } from "./api";

type Step = "phone" | "code" | "profile";

/** When "Resend code" becomes available (outside the component: reading the clock isn't rendering). */
const resendTime = (afterSeconds: number) => Date.now() + afterSeconds * 1000;

/**
 * /login (ADR-0020), like the big Indian beauty apps: mobile number → SMS code → in. A new
 * number gets one more step (name, optional email) and becomes a customer. Professionals log in
 * here too; admins use Team login (/admin/login).
 */
export function LoginPage() {
  const { t, i18n } = useTranslation("auth");
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const sessionEnded = params.get("reason") === "expired";

  const sendCode = useSendCode();
  const verify = useVerifyCode();
  const complete = useCompleteSignup();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<unknown>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [resendAt, setResendAt] = useState(0);
  const now = useNow(1000, step === "code");
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const phoneForm = useForm<SendCodeInput>({ resolver: standardSchemaResolver(sendCodeSchema), mode: "onTouched", defaultValues: { phone: "" } });
  const profileForm = useForm<CompleteSignupInput, unknown, CompleteSignupData>({
    resolver: standardSchemaResolver(completeSignupSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "" },
  });

  // The name step asks for one thing: put the caret there.
  const { setFocus } = profileForm;
  useEffect(() => {
    if (step === "profile") setFocus("name");
  }, [step, setFocus]);

  const welcome = async (user: UserDto, created: boolean) => {
    // The profile language applies from here on (plan C3), including this greeting.
    if (user.locale !== i18n.resolvedLanguage) await i18n.changeLanguage(user.locale);
    const tr = i18n.getFixedT(user.locale, "auth");
    toast(created ? tr("profile.created", { name: user.name.split(" ")[0] }) : tr("login.welcome", { name: user.name.split(" ")[0] }));
    await navigate(next ?? homeFor(user), { replace: true });
  };

  const requestCode = async (number: string) => {
    const sent = await sendCode.mutateAsync(number);
    setDevCode(sent.devCode);
    setResendAt(resendTime(sent.resendAfterSeconds));
    setCode("");
    setCodeError(undefined);
  };

  const onPhone = phoneForm.handleSubmit(async ({ phone: number }) => {
    setFormError(null);
    try {
      await requestCode(number);
      setPhone(number);
      setStep("code");
    } catch (error) {
      setFormError(applyServerErrors(error, phoneForm.setError, ["phone"]));
    }
  });

  const checkCode = async (value: string) => {
    if (verify.isPending) return;
    if (value.length !== LOGIN_CODE_LENGTH) {
      setCodeError(fieldText(t, "validation.loginCode"));
      return;
    }
    setFormError(null);
    setCodeError(undefined);
    try {
      const result = await verify.mutateAsync({ phone, code: value });
      if (result.status === "signed-in") await welcome(result.user, false);
      else setStep("profile");
    } catch (error) {
      setCode("");
      if (isApiError(error) && error.code === "LOGIN_CODE_INVALID") setCodeError(fieldText(t, "validation.loginCodeWrong"));
      else setFormError(error);
    }
  };

  const resend = async () => {
    setFormError(null);
    try {
      await requestCode(phone);
      toast(t("code.resent"));
    } catch (error) {
      setFormError(error);
    }
  };

  const onProfile = profileForm.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const locale = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : undefined;
      const { user } = await complete.mutateAsync({ ...values, locale });
      await welcome(user, true);
    } catch (error) {
      setFormError(applyServerErrors(error, profileForm.setError, ["name", "email"]));
    }
  });

  const changeNumber = () => {
    setFormError(null);
    setDevCode(undefined);
    setStep("phone");
  };

  /** The name step came too late (15 minutes): a fresh code for the same number. */
  const startAgain = async () => {
    setFormError(null);
    try {
      await requestCode(phone);
      setStep("code");
    } catch (error) {
      setFormError(error);
    }
  };

  const errorAlert = formError ? (
    <InlineAlert tone="danger">
      {errorText(t, formError)}
      {isApiError(formError) && formError.code === "TEAM_LOGIN_REQUIRED" && (
        <Box sx={{ mt: 2 }}>
          <Link to="/admin/login" standalone>
            {t("code.useTeamLogin")}
          </Link>
        </Box>
      )}
    </InlineAlert>
  ) : null;

  const consent = (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      <Trans t={t} i18nKey="login.consent" components={{ terms: <Link to="/legal/terms">Terms</Link>, privacy: <Link to="/legal/privacy">Privacy Policy</Link> }} />
    </Typography>
  );

  if (step === "code") {
    return (
      <AuthShell title={t("code.title")} description={t("code.description", { phone: formatIndianMobile(phone) })}>
        <Box
          component="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void checkCode(code);
          }}
          sx={{ display: "grid", gap: 5 }}
        >
          {errorAlert}
          {devCode && <InlineAlert tone="info">{t("code.devCode", { code: devCode })}</InlineAlert>}
          <OtpInput
            value={code}
            onChange={(value) => {
              setCode(value);
              if (codeError) setCodeError(undefined);
            }}
            onComplete={(value) => void checkCode(value)}
            length={LOGIN_CODE_LENGTH}
            label={t("code.label")}
            error={codeError}
            disabled={verify.isPending}
            focusOnMount
          />
          <Button type="submit" size="lg" fullWidth loading={verify.isPending} disabled={code.length !== LOGIN_CODE_LENGTH}>
            {t("code.submit")}
          </Button>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 3 }}>
            <Button variant="tertiary" size="sm" onClick={changeNumber}>
              {t("code.change")}
            </Button>
            {resendIn > 0 ? (
              <Typography variant="body2" aria-live="polite" sx={{ color: "text.secondary" }}>
                {t("code.resendIn", { seconds: resendIn })}
              </Typography>
            ) : (
              <Button variant="tertiary" size="sm" onClick={() => void resend()} loading={sendCode.isPending}>
                {t("code.resend")}
              </Button>
            )}
          </Box>
        </Box>
      </AuthShell>
    );
  }

  if (step === "profile") {
    const { register, formState } = profileForm;
    return (
      <AuthShell title={t("profile.title")} description={t("profile.description")}>
        <Box component="form" noValidate onSubmit={onProfile} sx={{ display: "grid", gap: 5 }}>
          {errorAlert}
          <TextField label={t("profile.name")} autoComplete="name" {...fieldProps(register("name"))} error={fieldText(t, formState.errors.name?.message)} />
          <TextField
            label={t("profile.email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            hint={t("profile.emailHint")}
            {...fieldProps(register("email"))}
            error={fieldText(t, formState.errors.email?.message)}
          />
          {consent}
          <Button type="submit" size="lg" fullWidth loading={complete.isPending}>
            {t("profile.submit")}
          </Button>
          {isApiError(formError) && formError.code === "LOGIN_CODE_EXPIRED" && (
            <Button variant="tertiary" size="sm" onClick={() => void startAgain()} loading={sendCode.isPending}>
              {t("code.resend")}
            </Button>
          )}
        </Box>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("login.title")} description={t("login.description")}>
      <Box component="form" noValidate onSubmit={onPhone} sx={{ display: "grid", gap: 5 }}>
        {errorAlert ?? (sessionEnded && <InlineAlert tone="info">{t("login.expired")}</InlineAlert>)}
        <Controller
          control={phoneForm.control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              label={t("login.phone")}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              hint={t("login.phoneHint")}
              error={fieldText(t, phoneForm.formState.errors.phone?.message)}
            />
          )}
        />
        <Button type="submit" size="lg" fullWidth loading={sendCode.isPending}>
          {t("login.submit")}
        </Button>
        {consent}
      </Box>
      <Typography sx={{ mt: 8, textAlign: "center", color: "text.secondary" }}>
        {t("login.teamPrompt")} <Link to="/admin/login">{t("login.teamLink")}</Link>
      </Typography>
    </AuthShell>
  );
}
