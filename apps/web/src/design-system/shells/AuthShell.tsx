import type { ReactNode } from "react";
import type { ImageRef } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { OfflineBanner } from "../components/OfflineBanner";
import { Picture } from "../components/Picture";
import { SkipLink } from "../components/VisuallyHidden";
import { Wordmark } from "../components/Wordmark";

export interface AuthShellProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** A photo beside the form from md (the website's login photo). */
  photo?: ImageRef | null;
  /** A line over the photo. */
  caption?: ReactNode;
  /** The logo link's content; the built-in wordmark otherwise. */
  logo?: ReactNode;
}

/** Login, sign-up and password pages: minimal header, centred 400px column, a photo beside it on wide screens. */
export function AuthShell({ title, description, children, photo = null, caption, logo }: AuthShellProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: photo ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)" }, bgcolor: tokens.neutral[25] }}>
      <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <SkipLink label={t("action.skipToContent")} />
        <Box component="header" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, px: { xs: 4, md: 8 }, py: 4 }}>
          <Box component={RouterLink} to="/" sx={{ display: "inline-flex", minWidth: 0, color: "inherit", textDecoration: "none" }}>
            {logo ?? <Wordmark size="sm" />}
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
      {photo && (
        <Box aria-hidden sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 0, height: "100dvh", p: 4 }}>
          <Box sx={{ position: "relative", height: "100%", borderRadius: `${tokens.radius.lg}px`, overflow: "hidden" }}>
            <Picture image={photo} alt="" sizes="50vw" ratio="auto" radius="lg" sx={{ position: "absolute", inset: 0, height: "100%", borderRadius: 0 }} />
            {caption && (
              <>
                <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,12,0) 50%, rgba(20,16,12,0.75) 100%)" }} />
                <Typography variant="h2" component="p" sx={{ position: "absolute", left: 32, right: 32, bottom: 32, m: 0, color: tokens.neutral[0] }}>
                  {caption}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
