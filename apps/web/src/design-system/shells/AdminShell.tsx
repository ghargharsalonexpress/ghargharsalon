import { type ReactNode, useState } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import { useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useLocation } from "react-router";
import { Avatar } from "../components/Avatar";
import { IconButton } from "../components/IconButton";
import { OfflineBanner } from "../components/OfflineBanner";
import { SkipLink } from "../components/VisuallyHidden";
import { Monogram, Wordmark } from "../components/Wordmark";
import type { NavItem } from "./types";

export interface AdminShellProps {
  nav: ReadonlyArray<NavItem>;
  title: ReactNode;
  alerts?: number;
  /** Where the alerts button leads (the dashboard's alert list). */
  alertsTo?: string;
  adminName: string;
  topBarExtra?: ReactNode;
  /** The notification bell, passed in so the shell stays free of queries. */
  bell?: ReactNode;
  children: ReactNode;
}

const SIDEBAR = 248;
const RAIL = 72;

/** Admin: 248px sidebar from lg, 72px icon rail at md, drawer below md (plan A7). */
export function AdminShell({ nav, title, alerts = 0, alertsTo, adminName, topBarExtra, bell, children }: AdminShellProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pathname } = useLocation();
  const isLarge = useMediaQuery(theme.breakpoints.up("lg"));
  const isMedium = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const n = theme.tokens.neutral;
  // A section stays highlighted on its detail pages (/admin/services/… under Services).
  const isCurrent = (item: NavItem) => pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`));

  const navList = (compact: boolean, onNavigate?: () => void) => (
    <List component="nav" aria-label="Admin" sx={{ px: compact ? 3 : 4, display: "grid", gap: 0.5 }}>
      {nav.map((item) => {
        const button = (
          <ListItemButton
            key={item.id}
            component={RouterLink}
            to={item.to}
            selected={isCurrent(item)}
            aria-current={isCurrent(item) ? "page" : undefined}
            aria-label={compact ? item.label : undefined}
            onClick={onNavigate}
            sx={{ justifyContent: compact ? "center" : "flex-start", px: compact ? 0 : 3, typography: "label" }}
          >
            {item.icon && <ListItemIcon sx={{ minWidth: compact ? 0 : 36 }}>{item.icon}</ListItemIcon>}
            {!compact && item.label}
          </ListItemButton>
        );
        return compact ? (
          <Tooltip key={item.id} title={item.label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </List>
  );

  const sidebarWidth = isLarge ? SIDEBAR : isMedium ? RAIL : 0;

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: n[25] }}>
      <SkipLink label={t("action.skipToContent")} />
      {sidebarWidth > 0 && (
        <Box
          component="aside"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100dvh",
            borderRight: `1px solid ${n[200]}`,
            bgcolor: n[0],
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: isLarge ? "flex-start" : "center", px: isLarge ? 6 : 0 }}>
            {isLarge ? <Wordmark size="sm" /> : <Monogram size={28} />}
          </Box>
          {navList(!isLarge)}
        </Box>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { width: "min(280px, 88vw)" } } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 4, minHeight: 56 }}>
          <Wordmark size="sm" />
          <IconButton label={t("action.close")} onClick={() => setDrawerOpen(false)} tooltip={false}>
            <CloseOutlined />
          </IconButton>
        </Box>
        {navList(false, () => setDrawerOpen(false))}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: theme.tokens.layer.appBar,
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            gap: 3,
            px: { xs: 3, md: 6 },
            bgcolor: n[0],
            borderBottom: `1px solid ${n[200]}`,
          }}
        >
          {sidebarWidth === 0 && (
            <IconButton label={t("action.menu")} onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
              <MenuOutlined />
            </IconButton>
          )}
          <Typography variant="h3" component="p" sx={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </Typography>
          {topBarExtra}
          {bell}
          <IconButton label={`Alerts, ${alerts}`} to={alertsTo}>
            <Badge badgeContent={alerts} color="primary" invisible={alerts === 0}>
              <NotificationsNoneOutlined />
            </Badge>
          </IconButton>
          <Avatar name={adminName} size="sm" />
        </Box>
        <OfflineBanner />
        <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, px: { xs: 4, md: 8 }, py: { xs: 6, md: 8 }, maxWidth: theme.tokens.container.admin, width: "100%", outline: "none" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
