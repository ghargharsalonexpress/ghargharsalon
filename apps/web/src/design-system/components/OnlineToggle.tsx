import { type ReactNode, useId } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export interface OnlineToggleProps {
  online: boolean;
  onChange: (online: boolean) => void;
  /** Visible state name, e.g. "Online" / "ऑनलाइन". */
  label: ReactNode;
  /** What the state means for them, e.g. "You'll get job alerts near you". */
  description: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  /** Why it can't be switched yet; shown under the control and announced with it. */
  reason?: ReactNode;
}

/**
 * The professional's Online switch (plan B8): one 64px control with its state in words and
 * colour, never colour alone. A native switch role, so screen readers say on/off.
 */
export function OnlineToggle({ online, onChange, label, description, pending = false, disabled = false, reason }: OnlineToggleProps) {
  const { tokens } = useTheme();
  const reasonId = useId();
  const s = tokens.semantic.success;
  const n = tokens.neutral;
  const blocked = disabled || pending;

  return (
    <Box>
      <ButtonBase
        role="switch"
        aria-checked={online}
        aria-busy={pending || undefined}
        aria-describedby={reason ? reasonId : undefined}
        disabled={disabled}
        onClick={() => {
          if (!blocked) onChange(!online);
        }}
        sx={{
          width: "100%",
          minHeight: 64,
          px: 4,
          py: 3,
          gap: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          borderRadius: `${tokens.radius.md}px`,
          border: `2px solid ${online ? s.fg : n[300]}`,
          bgcolor: online ? s.bg : n[0],
          opacity: disabled ? 0.6 : 1,
          cursor: blocked ? "default" : "pointer",
          transition: `background-color ${tokens.motion.duration.base}ms, border-color ${tokens.motion.duration.base}ms`,
          "&.Mui-focusVisible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ display: "block", typography: "h3", color: online ? s.fg : n[900] }}>
            {label}
          </Typography>
          <Typography component="span" variant="body2" sx={{ display: "block", mt: 0.5, color: n[700] }}>
            {description}
          </Typography>
        </Box>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            position: "relative",
            width: 56,
            height: 32,
            borderRadius: `${tokens.radius.full}px`,
            bgcolor: online ? s.fg : n[400],
            transition: `background-color ${tokens.motion.duration.base}ms`,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 4,
              left: online ? 28 : 4,
              width: 24,
              height: 24,
              borderRadius: `${tokens.radius.full}px`,
              bgcolor: n[0],
              display: "grid",
              placeItems: "center",
              transition: `left ${tokens.motion.duration.base}ms ${tokens.motion.easing.enter}`,
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            {pending && <CircularProgress size={14} thickness={6} sx={{ color: online ? s.fg : n[600] }} />}
          </Box>
        </Box>
      </ButtonBase>
      {reason && (
        <Typography id={reasonId} variant="body2" sx={{ mt: 2, color: n[700] }}>
          {reason}
        </Typography>
      )}
    </Box>
  );
}
