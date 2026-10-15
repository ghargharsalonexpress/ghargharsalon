import { useEffect, useMemo } from "react";
import type { PublicPageDto } from "@brand/shared";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { Button, InlineAlert, VisuallyHidden } from "@/design-system";
import { NotFoundContent } from "@/features/system/NotFoundPage";
import { isApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { pageQuery } from "./api";
import { PageMeta } from "./PageMeta";
import { SectionRenderer } from "./SectionRenderer";
import { PageVariablesContext, useText } from "./text";

/** "/about/" → "/about"; the home page stays "/". */
const normalise = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname) || "/";

/**
 * Any page built in Admin → Website (ADR-0021): home, about, contact, policies, city pages and
 * pages admins add. `?preview=1` shows an admin the unpublished draft.
 */
export function CmsPage() {
  const { t } = useTranslation("public");
  const { pathname, search } = useLocation();
  const path = normalise(pathname);
  const preview = new URLSearchParams(search).get("preview") === "1";
  const page = useQuery(pageQuery(path, preview));

  if (page.isPending) return <PageSkeleton />;
  if (page.isError) {
    if (isApiError(page.error) && page.error.status === 404) return <NotFoundContent />;
    return (
      <Container maxWidth={false} sx={{ maxWidth: 560, py: { xs: 12, md: 20 } }}>
        <InlineAlert
          tone="danger"
          title={t("site.loadErrorTitle")}
          action={
            <Button variant="tertiary" size="sm" onClick={() => void page.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {t("site.loadErrorBody")}
        </InlineAlert>
      </Container>
    );
  }
  return <PageBody page={page.data} />;
}

function PageBody({ page }: { page: PublicPageDto }) {
  const { i18n } = useTranslation();
  const { hash } = useLocation();
  const variables = useMemo(() => ({ updated: formatDate(new Date(page.updatedAt), i18n.language) }), [page.updatedAt, i18n.language]);
  const sections = page.sections.filter((section) => section.visible);
  const first = sections[0];
  const hasHeading = first?.type === "hero" || first?.type === "pageHeader";

  // The page arrives after the router's own scroll, so jump to #anchor once it's here.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView({ block: "start" });
  }, [hash, page]);

  return (
    <PageVariablesContext.Provider value={variables}>
      <PageMeta page={page} />
      {page.draft && <PreviewBar />}
      {!hasHeading && <HiddenTitle page={page} />}
      {sections.map((section, index) => (
        <SectionRenderer key={section.id} section={section} first={index === 0} />
      ))}
    </PageVariablesContext.Provider>
  );
}

function HiddenTitle({ page }: { page: PublicPageDto }) {
  const text = useText();
  return <VisuallyHidden component="h1">{text(page.title)}</VisuallyHidden>;
}

/** An admin looking at a draft always knows it isn't live yet. */
function PreviewBar() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  return (
    <Box role="status" sx={{ position: "sticky", top: { xs: 56, md: 64 }, zIndex: tokens.layer.sticky, bgcolor: tokens.semantic.warning.bg, borderBottom: `1px solid ${tokens.semantic.warning.border}`, color: tokens.semantic.warning.fg }}>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <VisibilityOutlined fontSize="small" aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t("site.previewBanner")}
        </Typography>
      </Container>
    </Box>
  );
}

function PageSkeleton() {
  const { tokens } = useTheme();
  return (
    <Box aria-busy="true">
      <Skeleton variant="rectangular" sx={{ height: { xs: 480, md: 620 }, transform: "none" }} />
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, py: 12 }}>
        <Skeleton width="40%" height={40} sx={{ mx: "auto" }} />
        <Box sx={{ mt: 8, display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} variant="rounded" sx={{ aspectRatio: "4 / 3", height: "auto" }} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
