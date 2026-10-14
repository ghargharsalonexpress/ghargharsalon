import type { ReactNode } from "react";
import Badge from "@mui/material/Badge";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import { OfflineBanner } from "../components/OfflineBanner";
import { SkipLink } from "../components/VisuallyHidden";
import type { NavItem } from "./types";

export interface ProShellProps {
  title: ReactNode;
  /** Online/offline pill and connection state, always visible (plan Phase 4 UX). */
  status?: ReactNode;
  nav: ReadonlyArray<NavItem>;
  banner?: ReactNode;
  children: ReactNode;
}

/** Professional panel: phone-first single column (600px max), bottom tabs with 48px+ targets. */
export function ProShell({ title, status, nav, banner, children }: ProShellProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { pathname } = useLocation();
  const n = tokens.neutral;
  // The most specific tab wins: /pro/earnings is Earnings, not Home (/pro).
  const current =
    nav
      .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0]?.id ?? false;

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: n[25] }}>
      <SkipLink label={t("action.skipToContent")} />
      {/* Focused controls scroll clear of the sticky header and bottom tabs (WCAG 2.4.11); toasts sit above the tabs. */}
      <GlobalStyles styles={{ html: { scrollPaddingTop: 72, scrollPaddingBottom: nav.length > 1 ? 88 : 0, ...(nav.length > 1 ? { "--toast-bottom": "80px" } : {}) } }} />
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: tokens.layer.appBar,
          bgcolor: n[0],
          borderBottom: `1px solid ${n[200]}`,
          pt: "env(safe-area-inset-top)",
        }}
      >
        <Box sx={{ maxWidth: 600, mx: "auto", px: 4, minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
          <Typography variant="h3" component="h1">
            {title}
          </Typography>
          {status}
        </Box>
        <OfflineBanner />
        {banner}
      </Box>
      <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, width: "100%", maxWidth: 600, mx: "auto", px: 4, py: 6, outline: "none" }}>
        {children}
      </Box>
      {/* Bottom tabs appear once there are at least two sections (Phase 4 adds Jobs, Earnings, Profile). */}
      {nav.length > 1 && (
      <Box
        component="nav"
        aria-label={t("landmark.professional")}
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: tokens.layer.actionBar,
          bgcolor: n[0],
          borderTop: `1px solid ${n[200]}`,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation
          value={current}
          showLabels
          sx={{
            maxWidth: 600,
            mx: "auto",
            height: 64,
            bgcolor: "transparent",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              minHeight: tokens.touchTarget.pro,
              color: n[600],
              "&.Mui-selected": { color: tokens.accent[700] },
            },
            "& .MuiBottomNavigationAction-label": { typography: "caption", fontWeight: 600, "&.Mui-selected": { fontSize: "0.75rem" } },
          }}
        >
          {nav.map((item) => (
            <BottomNavigationAction
              key={item.id}
              value={item.id}
              label={item.label}
              component={RouterLink}
              to={item.to}
              aria-current={current === item.id ? "page" : undefined}
              icon={
                item.badge ? (
                  <Badge badgeContent={item.badge} color="primary">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )
              }
            />
          ))}
        </BottomNavigation>
      </Box>
      )}
    </Box>
  );
}
