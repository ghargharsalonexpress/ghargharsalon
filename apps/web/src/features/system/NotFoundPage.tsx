import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, Picture } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { useSite } from "@/features/site/api";

/** The 404 message on its own, for pages inside a shell (the shell provides <main>). */
export function NotFoundContent() {
  const { t } = useTranslation();
  const photo = useSite().site.photos.notFound;
  usePageMeta(t("system.notFoundTitle"), undefined, { noindex: true });
  return (
    <Box sx={{ pt: { xs: 8, md: 12 } }}>
      {photo && (
        <Box sx={{ maxWidth: 420, mx: "auto", px: 4 }}>
          <Picture image={photo} alt="" sizes={420} ratio="16 / 10" radius="lg" />
        </Box>
      )}
      <EmptyState
        headingLevel="h1"
        title={t("system.notFoundTitle")}
        description={t("system.notFoundBody")}
        action={
          <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
            <Button to="/">{t("system.toStart")}</Button>
            <Button variant="secondary" to="/services">
              {t("system.seeServices")}
            </Button>
          </Box>
        }
      />
    </Box>
  );
}

/** Full-page 404 for routes outside any shell. */
export function NotFoundPage() {
  return (
    <Box component="main" id="main" sx={{ minHeight: "100dvh", display: "flex", alignItems: "center" }}>
      <NotFoundContent />
    </Box>
  );
}
