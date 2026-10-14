import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { VisuallyHidden } from "./VisuallyHidden";

export interface CountdownRingProps {
  /** Window length, e.g. 30 for a job offer. */
  totalSeconds: number;
  /** When the window ends (ms since epoch). */
  endsAt: number;
  size?: number;
  onExpire?: () => void;
}

const WARNING_AT = 10;

/** Functional motion only: the ring drains; turns amber at 10 s and announces it once. */
export function CountdownRing({ totalSeconds, endsAt, size = 112, onExpire }: CountdownRingProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const fraction = Math.min(1, remainingMs / (totalSeconds * 1000));

  useEffect(() => {
    if (remainingMs === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [remainingMs, onExpire]);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const warning = remaining <= WARNING_AT;
  const colour = warning ? tokens.semantic.warning.strong : tokens.accent[600];

  return (
    <Box role="timer" sx={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tokens.neutral[100]} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 250ms linear, stroke 160ms" }}
        />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="numericXl" component="span" aria-hidden sx={{ color: warning ? tokens.semantic.warning.fg : "text.primary" }}>
          {remaining}
        </Typography>
        <Typography variant="caption" component="span" aria-hidden sx={{ color: "text.secondary" }}>
          {t("countdown.secondsShort")}
        </Typography>
      </Box>
      <VisuallyHidden aria-live="polite">{warning && remaining > 0 ? t("countdown.secondsLeft", { count: WARNING_AT }) : ""}</VisuallyHidden>
      <VisuallyHidden>{t("countdown.secondsLeft", { count: remaining })}</VisuallyHidden>
    </Box>
  );
}
