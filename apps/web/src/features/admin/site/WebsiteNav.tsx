import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { Button } from "@/design-system";

const AREAS = [
  { id: "pages", to: "/admin/website" },
  { id: "brand", to: "/admin/website/brand" },
  { id: "menus", to: "/admin/website/menus" },
  { id: "seo", to: "/admin/website/seo" },
  { id: "requests", to: "/admin/website/requests" },
] as const;

/** The Website area's own links: pages, brand & theme, menus & footer, SEO & location, requests. */
export function WebsiteNav() {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const { pathname } = useLocation();
  const current = AREAS.find((area) => (area.id === "pages" ? pathname === area.to || pathname.startsWith("/admin/website/pages") : pathname.startsWith(area.to)))?.id;

  return (
    <Box component="nav" aria-label={t("website.navLabel")} sx={{ display: "flex", gap: 1, overflowX: "auto", mb: 6, pb: 1, borderBottom: `1px solid ${tokens.neutral[200]}` }}>
      {AREAS.map((area) => (
        <Button
          key={area.id}
          variant="tertiary"
          size="sm"
          to={area.to}
          aria-current={current === area.id ? "page" : undefined}
          sx={{ whiteSpace: "nowrap", color: current === area.id ? tokens.accent[700] : tokens.neutral[700], fontWeight: current === area.id ? 600 : 500, borderBottom: current === area.id ? `2px solid ${tokens.accent[600]}` : "2px solid transparent", borderRadius: 0 }}
        >
          {t(`website.nav.${area.id}`)}
        </Button>
      ))}
    </Box>
  );
}
