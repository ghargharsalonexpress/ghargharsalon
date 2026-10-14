import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import type { Tone } from "../tokens/color";
import { toneIcons } from "./toneIcons";

const ICON = { success: toneIcons.success, warning: toneIcons.warning, danger: toneIcons.error, info: toneIcons.info };

export interface BannerProps {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
}

/** Page-level status under the app bar: offline, reconnecting, session ending (plan B8). */
export function Banner({ tone = "info", children, action }: BannerProps) {
  const { tokens } = useTheme();
  const colours = tokens.semantic[tone];

  return (
    <Box
      role="status"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        px: { xs: 4, md: 8 },
        py: 2.5,
        bgcolor: colours.bg,
        borderBottom: `1px solid ${colours.border}`,
        color: tokens.neutral[900],
        typography: "body2",
      }}
    >
      <Box component="span" sx={{ display: "inline-flex", color: colours.strong, fontSize: 20 }} aria-hidden>
        {ICON[tone]}
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
      {action}
    </Box>
  );
}
