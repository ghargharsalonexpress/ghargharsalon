import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useLocation } from "react-router";
import { AccountShell, type NavItem } from "@/design-system";

/**
 * The customer's account area (plan A7): bookings, addresses and profile. A side menu from md;
 * on phones a short row of links at the top of each page.
 */
export function AccountLayout() {
  const { t } = useTranslation("account");
  const { tokens } = useTheme();
  const { pathname } = useLocation();

  const nav: NavItem[] = [
    { id: "bookings", label: t("nav.bookings"), to: "/account/bookings", icon: <EventNoteOutlined /> },
    { id: "addresses", label: t("nav.addresses"), to: "/account/addresses", icon: <PlaceOutlined /> },
    { id: "profile", label: t("nav.profile"), to: "/account", icon: <PersonOutlineOutlined /> },
  ];

  return (
    <AccountShell nav={nav}>
      <Box component="nav" aria-label={t("common:landmark.account")} sx={{ display: { xs: "block", md: "none" }, mb: 6 }}>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", gap: 2, flexWrap: "wrap" }}>
          {nav.map((item) => {
            const current = pathname === item.to;
            return (
              <li key={item.id}>
                <Box
                  component={RouterLink}
                  to={item.to}
                  aria-current={current ? "page" : undefined}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                    px: 4,
                    borderRadius: `${tokens.radius.full}px`,
                    border: `1px solid ${current ? tokens.accent[600] : tokens.neutral[300]}`,
                    bgcolor: current ? tokens.accent[50] : tokens.neutral[0],
                    color: current ? tokens.accent[700] : "text.primary",
                    typography: "label",
                    textDecoration: "none",
                    "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2 },
                  }}
                >
                  {item.label}
                </Box>
              </li>
            );
          })}
        </Box>
      </Box>
      <Outlet />
    </AccountShell>
  );
}
