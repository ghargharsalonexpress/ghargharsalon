import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { OfflineBanner } from "../components/OfflineBanner";
import { SkipLink } from "../components/VisuallyHidden";
import { Wordmark } from "../components/Wordmark";

/** Login, sign-up and password pages: minimal header, centred 400px column. */
export function AuthShell({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: tokens.neutral[25] }}>
      <SkipLink label={t("action.skipToContent")} />
      <Box component="header" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: { xs: 4, md: 8 }, py: 4 }}>
        <Box component={RouterLink} to="/" sx={{ display: "inline-flex", color: "inherit", textDecoration: "none" }}>
          <Wordmark size="sm" />
        </Box>
        <LanguageSwitch name="language-auth" />
      </Box>
      <OfflineBanner />
      <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, display: "flex", justifyContent: "center", px: 4, pt: { xs: 6, md: 16 }, pb: 12, outline: "none" }}>
        <Box sx={{ width: "100%", maxWidth: tokens.container.authCard }}>
          <Typography variant="h1">{title}</Typography>
          {description && <Typography sx={{ mt: 2, color: "text.secondary" }}>{description}</Typography>}
          <Box sx={{ mt: 8 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
