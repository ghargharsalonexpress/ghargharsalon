import { type ClipboardEvent, type KeyboardEvent, useEffect, useId, useRef } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

/** Customer side: the code to share at the door. Read digit by digit by screen readers. */
export function OtpDisplay({ code, hint }: { code: string; hint?: string }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const digits = code.split("");

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.accent[200]}`,
        bgcolor: tokens.accent[50],
        borderRadius: `${tokens.radius.md}px`,
        px: 5,
        py: 4,
      }}
    >
      <Typography variant="label" component="p" sx={{ m: 0, color: "text.primary" }}>
        {t("otp.startTitle")}
      </Typography>
      <Typography
        variant="numericXl"
        component="p"
        aria-label={`${t("otp.startTitle")}: ${digits.join(" ")}`}
        sx={{ m: 0, mt: 1, letterSpacing: "0.3em", color: tokens.neutral[900] }}
      >
        {code}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
        {hint ?? t("otp.shareHint")}
      </Typography>
    </Box>
  );
}

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  error?: string;
  attemptsLeft?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Called once every box holds a digit (the SMS login code submits itself, ADR-0020). */
  onComplete?: (code: string) => void;
  /** Puts the caret in the first box when the boxes appear (a step that only asks for the code). */
  focusOnMount?: boolean;
}

/**
 * Boxes for a numeric code, with numeric keypad, paste and SMS autofill support and
 * auto-advance (plan B8): four for the job start code, six for the SMS login code.
 */
export function OtpInput({ value, onChange, length = 4, label, error, attemptsLeft, disabled, autoFocus, onComplete, focusOnMount }: OtpInputProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const groupId = useId();
  const messageId = `${groupId}-message`;
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  // Six boxes must fit a 360px phone inside the login card.
  const compact = length > 4;

  useEffect(() => {
    if (focusOnMount) refs.current[0]?.focus();
  }, [focusOnMount]);

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && /^\d+$/.test(next)) onComplete?.(next);
  };

  // The boxes as they are on screen right now. Reading the DOM (not the last render) keeps fast
  // typing from losing a digit when two keys land before React re-renders.
  const onScreen = () => Array.from({ length }, (_, i) => (refs.current[i]?.value ?? digits[i] ?? "").replace(/\D/g, "").slice(-1));

  const setDigit = (index: number, digit: string) => {
    const next = onScreen();
    next[index] = digit;
    emit(next.join("").slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    // A whole code typed or autofilled into one box: spread it from here.
    if (typed.length > 2) {
      const next = onScreen();
      typed
        .slice(0, length - index)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      emit(next.join("").slice(0, length));
      refs.current[Math.min(index + typed.length, length - 1)]?.focus();
      return;
    }
    const digit = typed.slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    const box = event.currentTarget;
    // A filled box with no selection (a tap puts the caret beside the digit) would refuse the
    // key because of maxLength 1: empty it, and the typed digit replaces the old one.
    if (/^\d$/.test(event.key) && box.value && box.selectionStart === box.selectionEnd) box.value = "";
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, "");
      event.preventDefault();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    emit(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  const message = error ?? (attemptsLeft !== undefined ? t("otp.attemptsLeft", { count: attemptsLeft }) : undefined);

  return (
    <Box role="group" aria-labelledby={`${groupId}-label`} aria-describedby={message ? messageId : undefined}>
      <Typography id={`${groupId}-label`} variant="label" component="p" sx={{ m: 0, mb: 2 }}>
        {label ?? t("otp.enterTitle")}
      </Typography>
      <Box sx={{ display: "flex", gap: compact ? 2 : 3 }}>
        {digits.map((digit, index) => (
          <Box
            key={index}
            component="input"
            ref={(element: HTMLInputElement | null) => {
              refs.current[index] = element;
            }}
            value={digit}
            // onInput, not onChange: React skips onChange when a digit is typed over the same digit,
            // and the focus would stay put (a retyped code then lands one box short).
            onInput={(event: React.FormEvent<HTMLInputElement>) => handleChange(index, event.currentTarget.value)}
            onChange={() => undefined}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event: React.FocusEvent<HTMLInputElement>) => event.target.select()}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={t("otp.digit", { index: index + 1, count: length })}
            aria-invalid={error ? true : undefined}
            sx={{
              width: compact ? 44 : 56,
              height: compact ? 56 : 64,
              textAlign: "center",
              fontFamily: "inherit",
              fontSize: compact ? 24 : 28,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: tokens.neutral[900],
              bgcolor: disabled ? tokens.neutral[50] : tokens.neutral[0],
              border: `1px solid ${error ? tokens.semantic.danger.fg : tokens.neutral[500]}`,
              borderRadius: `${tokens.radius.sm}px`,
              outline: "none",
              "&:focus": { borderColor: tokens.accent[600], boxShadow: `inset 0 0 0 1px ${tokens.accent[600]}` },
            }}
          />
        ))}
      </Box>
      {message && (
        <Typography
          id={messageId}
          variant="body2"
          sx={{ mt: 2, color: error ? tokens.semantic.danger.fg : "text.secondary" }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
