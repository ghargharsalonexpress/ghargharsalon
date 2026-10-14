import type { ReactNode } from "react";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export type StepState = "done" | "current" | "upcoming";

export interface TrackerStep {
  id: string;
  label: ReactNode;
  /** e.g. "4:32 pm"; shown for done and current steps. */
  time?: ReactNode;
  detail?: ReactNode;
  state: StepState;
}

/** Vertical timeline used for bookings (all breakpoints, plan B8). */
export function StatusTracker({ steps, label }: { steps: ReadonlyArray<TrackerStep>; label: string }) {
  const { tokens } = useTheme();
  const n = tokens.neutral;
  const a = tokens.accent;

  return (
    <Box component="ol" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const done = step.state === "done";
        const current = step.state === "current";
        return (
          <Box
            component="li"
            key={step.id}
            aria-current={current ? "step" : undefined}
            sx={{ display: "grid", gridTemplateColumns: "24px 1fr", columnGap: 3, position: "relative", pb: last ? 0 : 5 }}
          >
            {!last && (
              <Box
                aria-hidden
                sx={{ position: "absolute", left: 11, top: 26, bottom: 2, width: 2, bgcolor: done ? a[600] : n[200] }}
              />
            )}
            <Box
              aria-hidden
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: done ? a[600] : n[0],
                border: `2px solid ${done || current ? a[600] : n[300]}`,
                color: n[0],
              }}
            >
              {done && <CheckOutlined sx={{ fontSize: 16 }} />}
              {current && <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: a[600] }} />}
            </Box>
            <Box sx={{ pt: 0.25 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                <Typography
                  component="span"
                  sx={{ fontWeight: current ? 600 : 400, color: step.state === "upcoming" ? "text.secondary" : "text.primary" }}
                >
                  {step.label}
                </Typography>
                {step.time && step.state !== "upcoming" && (
                  <Typography variant="body2" component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {step.time}
                  </Typography>
                )}
              </Box>
              {step.detail && (
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  {step.detail}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
