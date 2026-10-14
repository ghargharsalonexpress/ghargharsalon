import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button } from "@/design-system";
import { applyUpdate, useUpdateAvailable } from "@/lib/pwa";

/**
 * "New version available · Refresh" (plan C3). Never reloads by itself, so an update can't
 * interrupt a booking or a job; the person chooses the moment.
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const available = useUpdateAvailable();
  if (!available) return null;

  return (
    <Box
      role="status"
      sx={{
        position: "fixed",
        zIndex: tokens.layer.toast,
        left: { xs: 16, sm: 24 },
        right: { xs: 16, sm: "auto" },
        bottom: "calc(88px + env(safe-area-inset-bottom))",
        display: "flex",
        alignItems: "center",
        gap: 4,
        px: 4,
        py: 3,
        maxWidth: 420,
        borderRadius: `${tokens.radius.md}px`,
        bgcolor: tokens.neutral[900],
        color: tokens.neutral[0],
        boxShadow: tokens.elevation.e2,
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, color: "inherit" }}>
        {t("state.updateReady")}
      </Typography>
      <Button size="sm" variant="secondary" onClick={applyUpdate} sx={{ color: tokens.neutral[0], borderColor: tokens.neutral[500] }}>
        {t("action.refresh")}
      </Button>
    </Box>
  );
}
