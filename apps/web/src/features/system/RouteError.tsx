import { useEffect } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button, EmptyState } from "@/design-system";
import { reportClientError } from "@/lib/reportError";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Route error boundary (plan C13): a calm message and one action. A failed lazy chunk
 * (for example after a deploy) is also caught here, and Reload fetches the new build.
 */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  // The team hears about crashes (plan C13); a 404 is not one.
  useEffect(() => {
    if (!notFound) reportClientError("render", error);
  }, [error, notFound]);

  if (notFound) return <NotFoundPage />;
  if (import.meta.env.DEV) console.error(error);

  return (
    <Box component="main" id="main" sx={{ minHeight: "100dvh", display: "flex", alignItems: "center" }}>
      <EmptyState
        headingLevel="h1"
        title={t("system.errorTitle")}
        description={t("system.errorBody")}
        action={<Button onClick={() => window.location.reload()}>{t("action.reload")}</Button>}
      />
    </Box>
  );
}
