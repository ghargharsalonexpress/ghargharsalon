import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { Button, EmptyState } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";

/** The 404 message on its own, for pages inside a shell (the shell provides <main>). */
export function NotFoundContent() {
  const { t } = useTranslation();
  usePageMeta(t("system.notFoundTitle"));
  return (
    <EmptyState
      headingLevel="h1"
      title={t("system.notFoundTitle")}
      description={t("system.notFoundBody")}
      action={<Button to="/">{t("system.toStart")}</Button>}
    />
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
