import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Shown on the right from md; on phones put the primary action in <ActionBar>. */
  actions?: ReactNode;
  /** Admin detail pages only. */
  breadcrumb?: ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: { xs: 6, md: 8 } }}>
      {breadcrumb && <Box sx={{ mb: 2 }}>{breadcrumb}</Box>}
      <Box sx={{ display: "flex", alignItems: { md: "flex-end" }, justifyContent: "space-between", gap: 4, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0, flex: "1 1 320px" }}>
          <Typography variant="h1">{title}</Typography>
          {description && (
            <Typography sx={{ mt: 2, color: "text.secondary", maxWidth: "72ch" }}>{description}</Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>{actions}</Box>}
      </Box>
    </Box>
  );
}

/**
 * Sticky bottom bar for the one primary action on phones (plan B9): total + CTA,
 * safe-area aware. Hidden from md unless `always` is set.
 */
export function ActionBar({ children, always = false }: { children: ReactNode; always?: boolean }) {
  const { tokens, breakpoints } = useTheme();
  // Toasts sit above the bar while it shows, so they never cover its button.
  const lift = { ":root": { "--toast-bottom": "88px" } };
  return (
    <>
      <GlobalStyles styles={always ? lift : { [breakpoints.down("md")]: lift }} />
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: tokens.layer.actionBar,
          display: always ? "flex" : { xs: "flex", md: "none" },
          alignItems: "center",
          gap: 4,
          px: 4,
          pt: 3,
          pb: "calc(12px + env(safe-area-inset-bottom))",
          bgcolor: tokens.neutral[0],
          borderTop: `1px solid ${tokens.neutral[200]}`,
        }}
      >
        {children}
      </Box>
    </>
  );
}
