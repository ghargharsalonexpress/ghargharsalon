import { type ReactNode, useState } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import GlobalStyles from "@mui/material/GlobalStyles";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import { useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { OfflineBanner } from "../components/OfflineBanner";
import { SkipLink } from "../components/VisuallyHidden";
import { Wordmark } from "../components/Wordmark";
import type { NavItem } from "./types";

export interface PublicShellProps {
  nav: ReadonlyArray<NavItem>;
  /** Hidden until the cart exists (Phase 3) on pages that don't sell. */
  showCart?: boolean;
  /** The notification bell, passed in so the shell stays free of queries. */
  bell?: ReactNode;
  cartCount?: number;
  cartTo?: string;
  accountLabel: string;
  accountTo: string;
  /** The logo link's content; the built-in wordmark otherwise. */
  logo?: ReactNode;
  /** A slim bar above the header (an announcement). */
  topBar?: ReactNode;
  /** Beside the account button from md (the location chip). */
  headerExtra?: ReactNode;
  /** Under the header below md (the location chip on phones). */
  subHeader?: ReactNode;
  /** Rendered under the app bar (offline/reconnecting banners). */
  banner?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** A tab bar fixed to the bottom on phones. */
  bottomNav?: ReactNode;
}

/** Height of the phones' bottom tab bar, so content and toasts stay above it. */
export const BOTTOM_NAV_HEIGHT = 64;

/** Is this nav item the current page? "/#anchor" items are never "current". */
const isCurrent = (pathname: string, to: string) => !to.includes("#") && (to === pathname || (to !== "/" && pathname.startsWith(`${to}/`)));

/** Public website shell (plan A7): 56/64px app bar, drawer menu below lg, footer, phone tab bar. */
export function PublicShell({ nav, showCart = true, cartCount = 0, cartTo = "/cart", accountLabel, accountTo, logo, topBar, headerExtra, subHeader, banner, bell, children, footer, bottomNav }: PublicShellProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const n = theme.tokens.neutral;
  const mark = logo ?? <Wordmark />;

  const cartButton = (
    <IconButton label={t("action.openCart", { count: cartCount })} to={cartTo}>
      <Badge badgeContent={cartCount} color="primary" overlap="circular" invisible={cartCount === 0}>
        <ShoppingBagOutlined />
      </Badge>
    </IconButton>
  );

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: n[0] }}>
      {bottomNav && (
        <GlobalStyles
          styles={{
            [theme.breakpoints.down("md")]: {
              ":root": { "--toast-bottom": `${BOTTOM_NAV_HEIGHT + 24}px` },
              body: { paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` },
            },
          }}
        />
      )}
      <SkipLink label={t("action.skipToContent")} />
      {topBar}
      <AppBar sx={{ boxShadow: "0 1px 0 rgba(31,28,25,0.04), 0 8px 24px rgba(31,28,25,0.04)" }}>
        <Container maxWidth={false} sx={{ maxWidth: theme.tokens.container.marketing }}>
          <Toolbar disableGutters sx={{ gap: { xs: 2, md: 4 } }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: "inline-flex",
                // Only from lg, where the full nav sits beside it. On a phone it must still wrap,
                // or it pushes the menu button off the screen.
                flexShrink: { xs: 1, lg: 0 },
                minWidth: 0,
                whiteSpace: { xs: "normal", lg: "nowrap" },
                color: "inherit",
                textDecoration: "none",
                borderRadius: 1,
              }}
            >
              {mark}
            </Box>
            <Box component="nav" aria-label={t("landmark.main")} sx={{ display: { xs: "none", lg: "flex" }, gap: 0.5, ml: 4 }}>
              {nav.map((item) => {
                const current = isCurrent(pathname, item.to);
                return (
                  <Button
                    key={item.id}
                    variant={item.emphasis ? "secondary" : "tertiary"}
                    to={item.to}
                    aria-current={current ? "page" : undefined}
                    sx={
                      item.emphasis
                        ? { whiteSpace: "nowrap", borderRadius: 999, px: 4 }
                        : { whiteSpace: "nowrap", color: current ? theme.tokens.accent[700] : n[700], fontWeight: current ? 600 : 500, borderRadius: 999 }
                    }
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
            <Box sx={{ flex: 1 }} />
            {headerExtra && <Box sx={{ display: { xs: "none", md: "block" }, flexShrink: 1, minWidth: 0 }}>{headerExtra}</Box>}
            <Box sx={{ display: { xs: "none", lg: "block" }, flexShrink: 0 }}>
              <LanguageSwitch name="language-header" />
            </Box>
            <Box sx={{ display: { xs: "none", lg: "block" }, flexShrink: 0 }}>
              <Button to={accountTo} sx={{ whiteSpace: "nowrap", borderRadius: 999, px: 5 }}>
                {accountLabel}
              </Button>
            </Box>
            {bell}
            {showCart && cartButton}
            <Box sx={{ display: { xs: "block", lg: "none" } }}>
              <IconButton label={t("action.menu")} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
                <MenuOutlined />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
        {subHeader && (
          <Box sx={{ display: { xs: "block", md: "none" }, borderTop: `1px solid ${n[100]}` }}>
            <Container maxWidth={false} sx={{ py: 1.5 }}>
              {subHeader}
            </Container>
          </Box>
        )}
      </AppBar>
      <OfflineBanner />
      {banner}

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { width: "min(340px, 88vw)" } } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 4, minHeight: 64 }}>
          <Box sx={{ minWidth: 0 }}>{logo ?? <Wordmark size="sm" />}</Box>
          <IconButton label={t("action.close")} onClick={() => setMenuOpen(false)} tooltip={false}>
            <CloseOutlined />
          </IconButton>
        </Box>
        <List component="nav" aria-label={t("landmark.main")} sx={{ px: 2 }}>
          {nav.map((item) => (
            <ListItemButton
              key={item.id}
              component={RouterLink}
              to={item.to}
              selected={isCurrent(pathname, item.to)}
              onClick={() => setMenuOpen(false)}
              sx={{ typography: "body1", fontWeight: 500, borderRadius: 2, minHeight: 48 }}
            >
              {item.label}
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ px: 4, pt: 4, mt: "auto", pb: "calc(24px + env(safe-area-inset-bottom))", display: "grid", gap: 4 }}>
          <LanguageSwitch name="language-drawer" />
          <Button to={accountTo} fullWidth size="lg" onClick={() => setMenuOpen(false)} sx={{ borderRadius: 999 }}>
            {accountLabel}
          </Button>
        </Box>
      </Drawer>

      <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, outline: "none" }}>
        {children}
      </Box>

      {footer}
      {bottomNav}
    </Box>
  );
}
