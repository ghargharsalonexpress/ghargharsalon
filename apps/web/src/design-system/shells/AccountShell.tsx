import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import type { NavItem } from "./types";

/** Customer account area inside the public shell: 240px sub-nav from md, full width below. */
export function AccountShell({ nav, children }: { nav: ReadonlyArray<NavItem>; children: ReactNode }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { pathname } = useLocation();

  return (
    <Container maxWidth={false} sx={{ maxWidth: tokens.container.app, py: { xs: 6, md: 10 } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 840px)" }, gap: { md: 10 } }}>
        <Box component="nav" aria-label={t("landmark.account")} sx={{ display: { xs: "none", md: "block" } }}>
          <List disablePadding sx={{ position: "sticky", top: 88 }}>
            {nav.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton component={RouterLink} to={item.to} selected={pathname === item.to} aria-current={pathname === item.to ? "page" : undefined}>
                  {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                  {item.label}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Box>
    </Container>
  );
}
