import { type ReactNode, useState } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import { useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import { brand } from "@/brand";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Link } from "../components/Link";
import { OfflineBanner } from "../components/OfflineBanner";
import { SkipLink } from "../components/VisuallyHidden";
import { Wordmark } from "../components/Wordmark";
import type { NavItem } from "./types";

export interface PublicShellProps {
  nav: ReadonlyArray<NavItem>;
  /** Hidden until the cart exists (Phase 3) on pages that don't sell. */
  showCart?: boolean;
  cartCount?: number;
  cartTo?: string;
  accountLabel: string;
  accountTo: string;
  /** Rendered under the app bar (offline/reconnecting banners). */
  banner?: ReactNode;
  children: ReactNode;
  footer?: boolean;
}

/** Public website shell (plan A7): 56/64px app bar, drawer menu below md, footer. */
export function PublicShell({ nav, showCart = true, cartCount = 0, cartTo = "/cart", accountLabel, accountTo, banner, children, footer = true }: PublicShellProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const n = theme.tokens.neutral;

  const cartButton = (
    <IconButton label={t("action.openCart", { count: cartCount })} to={cartTo}>
      <Badge badgeContent={cartCount} color="primary" overlap="circular" invisible={cartCount === 0}>
        <ShoppingBagOutlined />
      </Badge>
    </IconButton>
  );

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: n[0] }}>
      <SkipLink label={t("action.skipToContent")} />
      <AppBar>
        <Container maxWidth={false} sx={{ maxWidth: theme.tokens.container.marketing }}>
          <Toolbar disableGutters sx={{ gap: 4 }}>
            <Box component={RouterLink} to="/" aria-label={brand.name} sx={{
                display: "inline-flex",
                // Only from lg, where the full nav sits beside it. On a phone it must still wrap,
                // or it pushes the menu button off the screen.
                flexShrink: { xs: 1, lg: 0 },
                whiteSpace: { xs: "normal", lg: "nowrap" },
                color: "inherit",
                textDecoration: "none",
                borderRadius: 1,
              }}>
              <Wordmark />
            </Box>
            <Box component="nav" aria-label={t("landmark.main")} sx={{ display: { xs: "none", lg: "flex" }, gap: 1, ml: 6 }}>
              {nav.map((item) => (
                <Button
                  key={item.id}
                  variant={item.emphasis ? "secondary" : "tertiary"}
                  to={item.to}
                  aria-current={pathname === item.to ? "page" : undefined}
                  sx={
                    item.emphasis
                      ? { whiteSpace: "nowrap" }
                      : { whiteSpace: "nowrap", color: pathname === item.to ? n[900] : n[700], fontWeight: pathname === item.to ? 600 : 500 }
                  }
                >
                  {item.label}
                </Button>
              ))}
            </Box>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: { xs: "none", lg: "block" }, flexShrink: 0 }}>
              <LanguageSwitch name="language-header" />
            </Box>
            <Box sx={{ display: { xs: "none", lg: "block" }, flexShrink: 0 }}>
              <Button variant="secondary" to={accountTo} sx={{ whiteSpace: "nowrap" }}>
                {accountLabel}
              </Button>
            </Box>
            {showCart && cartButton}
            <Box sx={{ display: { xs: "block", lg: "none" } }}>
              <IconButton label={t("action.menu")} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
                <MenuOutlined />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <OfflineBanner />
      {banner}

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { width: "min(320px, 88vw)" } } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 4, minHeight: 56 }}>
          <Wordmark size="sm" />
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
              selected={pathname === item.to}
              onClick={() => setMenuOpen(false)}
              sx={{ typography: "body1" }}
            >
              {item.label}
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ px: 4, pt: 4, mt: "auto", pb: "calc(24px + env(safe-area-inset-bottom))", display: "grid", gap: 4 }}>
          <LanguageSwitch name="language-drawer" />
          <Button variant="secondary" to={accountTo} fullWidth size="lg">
            {accountLabel}
          </Button>
        </Box>
      </Drawer>

      <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, outline: "none" }}>
        {children}
      </Box>

      {footer && <PublicFooter />}
    </Box>
  );
}

function PublicFooter() {
  const { t } = useTranslation();
  const theme = useTheme();
  const n = theme.tokens.neutral;
  const year = new Date().getFullYear();

  // "/register-as-professional" redirects to the Google Form (plan A7, legacy redirects).
  const columns = [
    { id: "company", links: [["about", "/about"], ["careers", "/about"], ["contact", "/contact"]] },
    { id: "help", links: [["howItWorks", "/#how-it-works"], ["cancellation", "/legal/cancellation-refund"], ["becomePro", "/register-as-professional"]] },
    { id: "legal", links: [["privacy", "/legal/privacy"], ["terms", "/legal/terms"]] },
  ] as const;

  return (
    <Box component="footer" sx={{ borderTop: `1px solid ${n[200]}`, bgcolor: n[25], mt: { xs: 12, md: 20 } }}>
      <Container maxWidth={false} sx={{ maxWidth: theme.tokens.container.marketing, py: { xs: 10, md: 14 } }}>
        <Box sx={{ display: "grid", gap: 8, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr" } }}>
          <Box>
            <Wordmark size="sm" />
            <Typography variant="body2" sx={{ mt: 3, color: "text.secondary", maxWidth: 320 }}>
              {brand.supportEmail} · {brand.supportPhone}
            </Typography>
          </Box>
          {columns.map((column) => (
            <Box key={column.id} component="nav" aria-label={t(`footer.${column.id}`)}>
              <Typography variant="label" component="h2" sx={{ m: 0, mb: 3, color: "text.primary" }}>
                {t(`footer.${column.id}`)}
              </Typography>
              {/* Touch screens get 44px rows (plan B9); mouse users keep the compact list. */}
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 2, "@media (pointer: coarse)": { gap: 0 } }}>
                {column.links.map(([key, to]) => (
                  <li key={key}>
                    <Link
                      to={to}
                      standalone
                      sx={{
                        color: n[700],
                        typography: "body2",
                        "@media (pointer: coarse)": { display: "inline-flex", alignItems: "center", minHeight: theme.tokens.touchTarget.default },
                      }}
                    >
                      {t(`footer.${key}`)}
                    </Link>
                  </li>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mt: 10, pt: 6, borderTop: `1px solid ${n[200]}`, color: "text.secondary" }}>
          © {year} {brand.name}
        </Typography>
      </Container>
    </Box>
  );
}
